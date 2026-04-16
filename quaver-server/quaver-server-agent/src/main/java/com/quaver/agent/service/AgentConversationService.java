package com.quaver.agent.service;

import com.quaver.agent.dto.AgentConversationPayload;
import com.quaver.agent.dto.AgentRuntimeStatusDto;
import com.quaver.agent.dto.CreateAgentConversationRequest;
import com.quaver.agent.dto.SendAgentMessageRequest;
import com.quaver.agent.dto.SendAgentMessageResponse;

public interface AgentConversationService {

    AgentConversationPayload getDefaultConversation();

    AgentConversationPayload createConversation(CreateAgentConversationRequest request);

    SendAgentMessageResponse sendMessage(String conversationId, SendAgentMessageRequest request);

    AgentRuntimeStatusDto getRuntimeStatus();
}
