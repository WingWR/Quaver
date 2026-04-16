package com.quaver.spotify.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpotifyPlaybackCommandRequest {

    private String trackId;

    private String spotifyUri;

    private String deviceId;

    private List<String> uris;

    private String contextUri;

    private Integer offsetPosition;

    private Integer positionMs;
}
