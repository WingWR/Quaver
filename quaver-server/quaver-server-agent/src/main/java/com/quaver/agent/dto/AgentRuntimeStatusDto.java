package com.quaver.agent.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRuntimeStatusDto {

    private boolean aiKeyConfigured;

    private String aiModel;

    private boolean spotifyBridgeEnabled;

    private boolean spotifyBridgeAuthorized;
}
