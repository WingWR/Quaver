package com.quaver.common.model.music;

import java.util.List;

public record PlaybackStateView(
        List<TrackView> queue,
        int currentTrackIndex,
        boolean isPlaying,
        int progress,
        int volume,
        PlaybackSource playbackSource,
        boolean isShuffleEnabled,
        RepeatMode repeatMode
) {
}
