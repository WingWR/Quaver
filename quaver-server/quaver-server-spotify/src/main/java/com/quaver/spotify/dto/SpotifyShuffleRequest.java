package com.quaver.spotify.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpotifyShuffleRequest {

    private boolean enabled;

    private String deviceId;
}
