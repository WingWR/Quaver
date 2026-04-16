package com.quaver.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentConversationDto {

    private String id;

    private String title;

    private String model;

    private String status;

    private String createdAt;

    private String updatedAt;
}
