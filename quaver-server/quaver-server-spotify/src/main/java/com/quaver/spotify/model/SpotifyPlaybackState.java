package com.quaver.spotify.model;

import com.quaver.common.model.music.RepeatMode;

public record SpotifyPlaybackState(
        SpotifyTrackItem currentTrack,
        Integer progressMs,
        Boolean isPlaying,
        Boolean shuffleEnabled,
        RepeatMode repeatMode,
        String deviceId,
        Integer volumePercent
) {
}
