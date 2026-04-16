package com.quaver.common.model.music;

import java.util.List;

public record PlaylistView(
        String id,
        String name,
        String description,
        String cover,
        String accent,
        List<TrackView> tracks,
        PlaybackSource source,
        String spotifyId,
        String spotifyUri,
        String ownerName
) {
}
