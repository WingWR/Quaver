package com.quaver.agent.dto;

import com.quaver.common.model.music.TrackView;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentTrackSearchResponse {

    private String query;

    private List<TrackView> tracks;

    private int total;

    private String model;

    private String requestId;

    private String status;

    private long tookMs;

    private String message;
}
