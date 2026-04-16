package com.quaver.spotify.model;

import java.util.List;

public record SpotifyQueueState(
        SpotifyTrackItem currentlyPlaying,
        List<SpotifyTrackItem> queue
) {
}
