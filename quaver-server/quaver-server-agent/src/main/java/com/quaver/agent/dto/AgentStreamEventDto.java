package com.quaver.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentStreamEventDto {

    private String type;

    private String delta;

    private AgentMessageDto message;

    private AgentOperationDto operation;

    private SendAgentMessageResponse response;

    private String error;
}
