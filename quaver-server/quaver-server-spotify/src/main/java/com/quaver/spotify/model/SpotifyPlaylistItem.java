package com.quaver.spotify.model;

public record SpotifyPlaylistItem(
        String id,
        String name,
        String description,
        String imageUrl,
        String uri,
        String ownerName
) {
}
