package com.quaver.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentOperationDto {

    private String id;

    private String type;

    private String title;

    private String detail;

    private String status;

    private String createdAt;
}
