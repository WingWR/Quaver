import { BackendApiError, backendRequest } from "../../../api/http";
import { appConfig } from "../../../config/app";
import type {
  AgentConversationPayload,
  CreateAgentConversationRequest,
  SendAgentMessageRequest,
  SendAgentMessageResponse,
} from "./types";

const AGENT_BASE_PATH = "/agent";

function buildAgentHeaders() {
  return appConfig.agent.apiKey
    ? {
        "x-agent-api-key": appConfig.agent.apiKey,
      }
    : undefined;
}

export function fetchDefaultAgentConversation(signal?: AbortSignal) {
  return backendRequest<AgentConversationPayload>(`${AGENT_BASE_PATH}/conversations/default`, {
    signal,
    headers: buildAgentHeaders(),
  });
}

export function createAgentConversation(
  input: CreateAgentConversationRequest = {},
  signal?: AbortSignal,
) {
  return backendRequest<AgentConversationPayload>(`${AGENT_BASE_PATH}/conversations`, {
    method: "POST",
    signal,
    headers: buildAgentHeaders(),
    body: JSON.stringify({
      title: input.title ?? appConfig.agent.defaultConversationTitle,
      model: input.model ?? appConfig.agent.model,
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
      headers: buildAgentHeaders(),
      body: JSON.stringify({
        content: input.content,
        model: input.model ?? appConfig.agent.model,
        spotifyDeveloperAccount:
          input.spotifyDeveloperAccount ?? appConfig.spotify.developerAccount,
        metadata: input.metadata,
      }),
    },
  );
}
