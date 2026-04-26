package com.quaver.spotify.model;

public record SpotifyDevice(
        String id,
        String name,
        String type,
        Boolean active,
        Boolean restricted,
        Integer volumePercent
) {
}
