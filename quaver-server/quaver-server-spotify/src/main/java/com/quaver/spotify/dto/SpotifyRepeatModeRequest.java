package com.quaver.spotify.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpotifyRepeatModeRequest {

    private String mode;

    private String deviceId;
}
