import { useEffect, useMemo, useState } from "react";
import { formatBackendError } from "../../../api/http";
import { appConfig } from "../../../config/app";
import { useQuaverStore } from "../../../store/useQuaverStore";
import { useUiStore } from "../../../store/useUiStore";
import { getOrCreateAgentConversation, sendAgentMessage } from "../api/client";
import type {
  AgentConversation,
  AgentConversationPayload,
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
) {
  if (response.messages?.length) {
    return response.messages;
  }

  return [
    ...currentMessages.filter((message) => message.id !== optimisticUserMessageId),
    ...(response.userMessage ? [response.userMessage] : []),
    ...(response.assistantMessage ? [response.assistantMessage] : []),
  ];
}

export function useAgentConversationRuntime(isActive: boolean) {
  const agentDraft = useQuaverStore((state) => state.agentDraft);
  const setAgentDraft = useQuaverStore((state) => state.setAgentDraft);
  const pushNotice = useUiStore((state) => state.pushNotice);
  const [conversation, setConversation] = useState<AgentConversation | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [status, setStatus] = useState<AgentViewStatus>("idle");
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  async function loadConversation(signal?: AbortSignal) {
    setStatus("loading");

    const payload = await getOrCreateAgentConversation(signal);
    setConversation(payload.conversation);
    setMessages(payload.messages);
    setHelperMessage(
      payload.messages.length
        ? null
        : "The conversation is ready, but there is no operation history yet.",
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
        appConfig.agent.model,
      );

      setMessages((currentMessages) => [...currentMessages, optimisticUserMessage]);
      setAgentDraft("");

      const response = await sendAgentMessage(activeConversationPayload.conversation.id, {
        content,
      });

      setConversation(response.conversation);
      setMessages((currentMessages) =>
        mergeMessages(currentMessages, optimisticUserMessage.id, response),
      );
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
    draft: agentDraft,
    setDraft: setAgentDraft,
    status,
    helperMessage,
    canSend,
    reloadConversation,
    submitDraft,
    model: conversation?.model ?? appConfig.agent.model,
  };
}
