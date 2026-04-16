package com.quaver.spotify.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpotifyQueueCommandRequest {

    private String spotifyUri;

    private String deviceId;
}
