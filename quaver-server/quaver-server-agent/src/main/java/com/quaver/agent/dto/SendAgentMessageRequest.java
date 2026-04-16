package com.quaver.agent.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendAgentMessageRequest {

    private String content;

    private String model;

    private String spotifyDeveloperAccount;

    private Map<String, Object> metadata;
}
