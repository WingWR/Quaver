package com.quaver.common.model.music;

import java.util.List;

public record TrackView(
        String id,
        String title,
        String artist,
        String album,
        int duration,
        String artwork,
        String accent,
        String mood,
        List<String> genres,
        PlaybackSource source,
        String spotifyId,
        String spotifyUri,
        String spotifyUrl,
        List<LyricLineView> lyrics
) {
}
