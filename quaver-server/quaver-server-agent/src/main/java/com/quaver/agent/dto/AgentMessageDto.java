package com.quaver.agent.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentMessageDto {

    private String id;

    private String conversationId;

    private String role;

    private String content;

    private String createdAt;

    private String status;

    private String model;

    private List<AgentOperationDto> operations;

    private Map<String, Object> metadata;
}
