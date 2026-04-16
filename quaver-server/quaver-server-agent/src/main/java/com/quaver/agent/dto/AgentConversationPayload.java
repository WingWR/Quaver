package com.quaver.agent.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentConversationPayload {

    private AgentConversationDto conversation;

    private List<AgentMessageDto> messages;
}
