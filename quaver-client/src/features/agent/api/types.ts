import type { LibraryMutationResponse } from "../../library/api/types";

export type AgentMessageRole = "system" | "user" | "assistant";
export type AgentItemStatus = "pending" | "running" | "completed" | "failed";

export interface AgentOperation {
  id: string;
  type: "tool_call" | "status" | "decision" | "system" | "agent_request" | "agent_response";
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

export interface AgentRuntimeStatus {
  aiKeyConfigured: boolean;
  aiModel: string;
  aiSearchModel: string;
  aiAgentModel: string;
  aiBaseUrl: string;
  spotifyBridgeEnabled: boolean;
  spotifyBridgeAuthorized: boolean;
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
  libraryMutation?: LibraryMutationResponse;
}

export type AgentStreamEventType =
  | "user_message"
  | "operation"
  | "assistant_message_start"
  | "assistant_delta"
  | "assistant_message_done"
  | "final"
  | "error";

export interface AgentStreamEvent {
  type: AgentStreamEventType;
  delta?: string;
  message?: AgentMessage;
  operation?: AgentOperation;
  response?: SendAgentMessageResponse;
  error?: string;
}
