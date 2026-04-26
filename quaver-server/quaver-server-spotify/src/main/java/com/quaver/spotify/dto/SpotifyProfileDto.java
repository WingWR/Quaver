package com.quaver.spotify.dto;

public record SpotifyProfileDto(
        String displayName,
        String email,
        String imageUrl
) {
}
