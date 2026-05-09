import { useEffect, useMemo, useState } from "react";
import { formatBackendError } from "../../../api/http";
import { appConfig } from "../../../config/app";
import { usePlaybackControllerRuntime } from "../../../hooks/usePlaybackControllerRuntime";
import { updateBackendPlaybackState } from "../../library/api/client";
import { useQuaverStore } from "../../../store/useQuaverStore";
import { useUiStore } from "../../../store/useUiStore";
import { fetchAgentRuntimeStatus, getOrCreateAgentConversation, sendAgentMessageStream } from "../api/client";
import type {
  AgentConversation,
  AgentConversationPayload,
  AgentOperation,
  AgentRuntimeStatus,
  AgentMessage,
  SendAgentMessageResponse,
} from "../api/types";

type AgentViewStatus = "idle" | "loading" | "ready" | "submitting" | "error";

const AGENT_UNAVAILABLE_MESSAGE =
  "Agent backend is not ready. The workspace stays visible, and live actions will work after the backend is connected.";

function createOptimisticMessage(
  conversationId: string,
  content: string,
  model: string,
): AgentMessage {
  return {
    id: `local-user-${Date.now()}`,
    conversationId,
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    status: "completed",
    model,
  };
}

function mergeMessages(
  currentMessages: AgentMessage[],
  optimisticUserMessageId: string,
  response: SendAgentMessageResponse,
  streamingAssistantMessageId?: string,
) {
  if (response.messages?.length) {
    return response.messages;
  }

  const responseMessageIds = new Set(
    [response.userMessage?.id, response.assistantMessage?.id].filter(Boolean),
  );

  return [
    ...currentMessages.filter(
      (message) =>
        message.id !== optimisticUserMessageId &&
        message.id !== streamingAssistantMessageId &&
        !responseMessageIds.has(message.id),
    ),
    ...(response.userMessage ? [response.userMessage] : []),
    ...(response.assistantMessage ? [response.assistantMessage] : []),
  ];
}

function upsertMessage(messages: AgentMessage[], nextMessage: AgentMessage) {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex < 0) {
    return [...messages, nextMessage];
  }

  return messages.map((message) => (message.id === nextMessage.id ? nextMessage : message));
}

export function useAgentConversationRuntime(isActive: boolean) {
  const agentDraft = useQuaverStore((state) => state.agentDraft);
  const setAgentDraft = useQuaverStore((state) => state.setAgentDraft);
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const isPlaying = useQuaverStore((state) => state.isPlaying);
  const progress = useQuaverStore((state) => state.progress);
  const playbackSource = useQuaverStore((state) => state.playbackSource);
  const isShuffleEnabled = useQuaverStore((state) => state.isShuffleEnabled);
  const repeatMode = useQuaverStore((state) => state.repeatMode);
  const replaceBackendPlaylists = useQuaverStore((state) => state.replaceBackendPlaylists);
  const pushNotice = useUiStore((state) => state.pushNotice);
  const { applyAgentPlaybackMutation } = usePlaybackControllerRuntime();
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [operations, setOperations] = useState<AgentOperation[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<AgentRuntimeStatus | null>(null);
  const [status, setStatus] = useState<AgentViewStatus>("idle");
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  async function loadConversation(signal?: AbortSignal) {
    setStatus("loading");

    const [payload, runtime] = await Promise.all([
      getOrCreateAgentConversation(signal),
      fetchAgentRuntimeStatus(signal).catch(() => null),
    ]);

    if (runtime) {
      setRuntimeStatus(runtime);
    }
    setConversation(payload.conversation);
    setMessages(payload.messages);
    setHelperMessage(
      runtime && !runtime.aiKeyConfigured
        ? "Agent is wired, but there is not an API key yet."
        : payload.messages.length
        ? null
        : "The conversation is ready.",
    );
    setStatus("ready");
    return payload;
  }

  useEffect(() => {
    if (!isActive || conversation) {
      return;
    }

    const controller = new AbortController();

    loadConversation(controller.signal).catch((error) => {
      if (controller.signal.aborted) {
        return;
      }

      const message = formatBackendError(error, AGENT_UNAVAILABLE_MESSAGE);
      setStatus("error");
      setHelperMessage(message);
      pushNotice({
        message,
        variant: "warning",
        dedupeKey: "agent-workspace-bootstrap",
      });
    });

    return () => controller.abort();
  }, [conversation, isActive, pushNotice]);

  async function reloadConversation() {
    const controller = new AbortController();

    try {
      await loadConversation(controller.signal);
    } catch (error) {
      const message = formatBackendError(error, AGENT_UNAVAILABLE_MESSAGE);
      setStatus("error");
      setHelperMessage(message);
      pushNotice({
        message,
        variant: "warning",
        dedupeKey: "agent-workspace-reload",
      });
    }
  }

  async function applyLibraryMutation(response: SendAgentMessageResponse) {
    const mutation = response.libraryMutation;
    if (!mutation) {
      return;
    }

    const assistantMetadata = response.assistantMessage?.metadata;
    const intent = readAgentIntent(assistantMetadata);
    if (mutation.playlists) {
      replaceBackendPlaylists(
        mutation.playlists,
        intent === "CREATE_PLAYLIST" ? undefined : mutation.selectedPlaylistId,
      );
    }

    const playbackCommand = readPlaybackCommand(assistantMetadata);
    if (mutation.playback && playbackCommand) {
      await applyAgentPlaybackMutation(
        mutation.playback,
        playbackCommand,
      );
    }
  }

  async function submitDraft() {
    const content = agentDraft.trim();
    if (!content) {
      return;
    }

    setStatus("submitting");

    try {
      const activeConversationPayload: AgentConversationPayload =
        conversation
          ? { conversation, messages }
          : await loadConversation();
      const optimisticUserMessage = createOptimisticMessage(
        activeConversationPayload.conversation.id,
        content,
        appConfig.agent.chatModel,
      );

      setMessages((currentMessages) => [...currentMessages, optimisticUserMessage]);
      setOperations([]);
      setAgentDraft("");
      let streamingAssistantMessageId: string | undefined;

      try {
        await updateBackendPlaybackState({
          queue,
          currentTrackIndex,
          isPlaying,
          progress,
          playbackSource,
          isShuffleEnabled,
          repeatMode,
        });
      } catch (error) {
        pushNotice({
          message: formatBackendError(
            error,
            "Agent may see an older playback queue because the current queue could not be synced first.",
          ),
          variant: "warning",
          dedupeKey: "agent-playback-context-sync",
        });
      }

      await sendAgentMessageStream(activeConversationPayload.conversation.id, {
        content,
        metadata: {
          selectedPlaylistId,
          queueTrackIds: queue.map((track) => track.id),
          currentTrackIndex,
          isPlaying,
          progress,
          playbackSource,
          isShuffleEnabled,
          repeatMode,
        },
      }, {
        onUserMessage: (event) => {
          if (!event.message) {
            return;
          }
          setMessages((currentMessages) => [
            ...currentMessages.filter((message) => message.id !== optimisticUserMessage.id),
            event.message as AgentMessage,
          ]);
        },
        onOperation: (event) => {
          if (!event.operation) {
            return;
          }
          setOperations((currentOperations) => [...currentOperations, event.operation as AgentOperation]);
        },
        onAssistantMessageStart: (event) => {
          if (!event.message) {
            return;
          }
          streamingAssistantMessageId = event.message.id;
          setMessages((currentMessages) => upsertMessage(currentMessages, event.message as AgentMessage));
        },
        onAssistantDelta: (event) => {
          if (!event.delta || !streamingAssistantMessageId) {
            return;
          }
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === streamingAssistantMessageId
                ? {
                    ...message,
                    content: `${message.content}${event.delta}`,
                    status: "running",
                  }
                : message,
            ),
          );
        },
        onAssistantMessageDone: (event) => {
          if (!event.message) {
            return;
          }
          streamingAssistantMessageId = event.message.id;
          setMessages((currentMessages) => upsertMessage(currentMessages, event.message as AgentMessage));
        },
        onFinal: (event) => {
          if (!event.response) {
            return;
          }
          const response = event.response;
          setConversation(response.conversation);
          void applyLibraryMutation(response);
          setMessages((currentMessages) =>
            mergeMessages(currentMessages, optimisticUserMessage.id, response, streamingAssistantMessageId),
          );
        },
        onError: (event) => {
          throw new Error(event.error || AGENT_UNAVAILABLE_MESSAGE);
        },
      });

      setStatus("ready");
      setHelperMessage(null);
    } catch (error) {
      setAgentDraft(content);
      const message = formatBackendError(error, AGENT_UNAVAILABLE_MESSAGE);
      setStatus("error");
      setHelperMessage(message);
      pushNotice({
        message,
        variant: "warning",
        dedupeKey: "agent-workspace-submit",
      });
    }
  }

  const canSend = useMemo(
    () => status !== "loading" && status !== "submitting",
    [status],
  );

  return {
    conversation,
    messages,
    operations,
    runtimeStatus,
    draft: agentDraft,
    setDraft: setAgentDraft,
    status,
    helperMessage,
    canSend,
    reloadConversation,
    submitDraft,
    model: conversation?.model ?? appConfig.agent.chatModel,
  };
}

function readPlaybackCommand(metadata?: Record<string, unknown>) {
  const value = metadata?.playbackCommand;
  return typeof value === "string" ? value : undefined;
}

function readAgentIntent(metadata?: Record<string, unknown>) {
  const value = metadata?.intent;
  return typeof value === "string" ? value : undefined;
}
