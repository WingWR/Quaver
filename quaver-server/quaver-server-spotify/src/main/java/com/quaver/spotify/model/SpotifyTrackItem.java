package com.quaver.spotify.model;

import java.util.List;

public record SpotifyTrackItem(
        String id,
        String name,
        String albumName,
        Integer durationMs,
        String imageUrl,
        String uri,
        String externalUrl,
        List<SpotifyArtistItem> artists
) {
}
