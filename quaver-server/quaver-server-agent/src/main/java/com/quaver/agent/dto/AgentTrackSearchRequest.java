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
public class AgentTrackSearchRequest {

    private String query;

    private String model;

    private Integer limit;

    private String selectedPlaylistId;

    private List<String> playlistIds;

    private List<String> queueTrackIds;

    private String spotifyDeveloperAccount;

    private Map<String, Object> metadata;
}
