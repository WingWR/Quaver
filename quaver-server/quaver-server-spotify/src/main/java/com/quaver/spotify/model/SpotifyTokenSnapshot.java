package com.quaver.spotify.model;

import java.time.LocalDateTime;
import java.util.List;

public record SpotifyTokenSnapshot(
        String accessToken,
        String refreshToken,
        String tokenType,
        List<String> scopes,
        LocalDateTime expiresAt
) {
}
