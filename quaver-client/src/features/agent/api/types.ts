export type AgentMessageRole = "system" | "user" | "assistant";
export type AgentItemStatus = "pending" | "running" | "completed" | "failed";

export interface AgentOperation {
  id: string;
  type: "tool_call" | "status" | "decision" | "system";
  title: string;
  detail?: string;
  status: AgentItemStatus;
  createdAt: string;
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: AgentMessageRole;
  content: string;
  createdAt: string;
  status: AgentItemStatus;
  model?: string;
  operations?: AgentOperation[];
  metadata?: Record<string, unknown>;
}

export interface AgentConversation {
  id: string;
  title: string;
  model: string;
  status: "idle" | "running" | "error";
  createdAt: string;
  updatedAt: string;
}

export interface AgentConversationPayload {
  conversation: AgentConversation;
  messages: AgentMessage[];
}

export interface CreateAgentConversationRequest {
  title?: string;
  model?: string;
  spotifyDeveloperAccount?: string;
  metadata?: Record<string, unknown>;
}

export interface SendAgentMessageRequest {
  content: string;
  model?: string;
  spotifyDeveloperAccount?: string;
  metadata?: Record<string, unknown>;
}

export interface SendAgentMessageResponse {
  conversation: AgentConversation;
  userMessage?: AgentMessage;
  assistantMessage?: AgentMessage;
  messages?: AgentMessage[];
}
