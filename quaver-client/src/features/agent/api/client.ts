import {
  BackendApiError,
  backendRequest,
  buildBackendRequestHeaders,
  resolveBackendUrl,
} from "../../../api/http";
import { appConfig } from "../../../config/app";
import type {
  AgentStreamEvent,
  AgentConversationPayload,
  AgentRuntimeStatus,
  CreateAgentConversationRequest,
  SendAgentMessageRequest,
  SendAgentMessageResponse,
} from "./types";

const AGENT_BASE_PATH = "/agent";

export function fetchDefaultAgentConversation(signal?: AbortSignal) {
  return backendRequest<AgentConversationPayload>(`${AGENT_BASE_PATH}/conversations/default`, {
    signal,
  });
}

export function createAgentConversation(
  input: CreateAgentConversationRequest = {},
  signal?: AbortSignal,
) {
  return backendRequest<AgentConversationPayload>(`${AGENT_BASE_PATH}/conversations`, {
    method: "POST",
    signal,
    body: JSON.stringify({
      title: input.title ?? appConfig.agent.defaultConversationTitle,
      model: input.model ?? appConfig.agent.chatModel,
      spotifyDeveloperAccount: input.spotifyDeveloperAccount ?? appConfig.spotify.developerAccount,
      metadata: input.metadata,
    }),
  });
}

export async function getOrCreateAgentConversation(signal?: AbortSignal) {
  try {
    return await fetchDefaultAgentConversation(signal);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return createAgentConversation({}, signal);
    }

    throw error;
  }
}

export function sendAgentMessage(
  conversationId: string,
  input: SendAgentMessageRequest,
  signal?: AbortSignal,
) {
  return backendRequest<SendAgentMessageResponse>(
    `${AGENT_BASE_PATH}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      signal,
      body: JSON.stringify({
        content: input.content,
        model: input.model ?? appConfig.agent.chatModel,
        spotifyDeveloperAccount:
          input.spotifyDeveloperAccount ?? appConfig.spotify.developerAccount,
        metadata: input.metadata,
      }),
    },
  );
}

export interface AgentMessageStreamHandlers {
  onEvent?: (event: AgentStreamEvent) => void;
  onUserMessage?: (event: AgentStreamEvent) => void;
  onAssistantMessageStart?: (event: AgentStreamEvent) => void;
  onAssistantDelta?: (event: AgentStreamEvent) => void;
  onAssistantMessageDone?: (event: AgentStreamEvent) => void;
  onOperation?: (event: AgentStreamEvent) => void;
  onFinal?: (event: AgentStreamEvent) => void;
  onError?: (event: AgentStreamEvent) => void;
}

export async function sendAgentMessageStream(
  conversationId: string,
  input: SendAgentMessageRequest,
  handlers: AgentMessageStreamHandlers,
  signal?: AbortSignal,
) {
  const response = await fetch(
    resolveBackendUrl(
      `${AGENT_BASE_PATH}/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
    ),
    {
      method: "POST",
      signal,
      headers: buildBackendRequestHeaders({
        accept: "text/event-stream",
        hasBody: true,
      }),
      body: JSON.stringify({
        content: input.content,
        model: input.model ?? appConfig.agent.chatModel,
        spotifyDeveloperAccount:
          input.spotifyDeveloperAccount ?? appConfig.spotify.developerAccount,
        metadata: input.metadata,
      }),
    },
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new BackendApiError(
      payload || `Agent stream failed with status ${response.status}.`,
      response.status,
      payload,
    );
  }

  if (!response.body) {
    throw new BackendApiError("Agent stream did not return a response body.", response.status, null);
  }

  await readAgentSseStream(response.body, handlers);
}

async function readAgentSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: AgentMessageStreamHandlers,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      buffer = consumeSseBlocks(buffer, handlers);
    }

    buffer += decoder.decode();
    consumeSseBlocks(`${buffer}\n\n`, handlers);
  } finally {
    reader.releaseLock();
  }
}

export function fetchAgentRuntimeStatus(signal?: AbortSignal) {
  return backendRequest<AgentRuntimeStatus>(`${AGENT_BASE_PATH}/runtime-status`, {
    signal,
  });
}

function consumeSseBlocks(buffer: string, handlers: AgentMessageStreamHandlers) {
  let nextBuffer = buffer;
  let boundary = findSseBoundary(nextBuffer);

  while (boundary >= 0) {
    const block = nextBuffer.slice(0, boundary);
    nextBuffer = nextBuffer.slice(boundary + (nextBuffer[boundary] === "\r" ? 4 : 2));
    dispatchSseBlock(block, handlers);
    boundary = findSseBoundary(nextBuffer);
  }

  return nextBuffer;
}

function findSseBoundary(buffer: string) {
  const lfBoundary = buffer.indexOf("\n\n");
  const crlfBoundary = buffer.indexOf("\r\n\r\n");

  if (lfBoundary === -1) {
    return crlfBoundary;
  }
  if (crlfBoundary === -1) {
    return lfBoundary;
  }
  return Math.min(lfBoundary, crlfBoundary);
}

function dispatchSseBlock(block: string, handlers: AgentMessageStreamHandlers) {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) {
    return;
  }

  const event = JSON.parse(dataLines.join("\n")) as AgentStreamEvent;
  handlers.onEvent?.(event);

  switch (event.type) {
    case "user_message":
      handlers.onUserMessage?.(event);
      break;
    case "operation":
      handlers.onOperation?.(event);
      break;
    case "assistant_message_start":
      handlers.onAssistantMessageStart?.(event);
      break;
    case "assistant_delta":
      handlers.onAssistantDelta?.(event);
      break;
    case "assistant_message_done":
      handlers.onAssistantMessageDone?.(event);
      break;
    case "final":
      handlers.onFinal?.(event);
      break;
    case "error":
      handlers.onError?.(event);
      break;
  }
}
