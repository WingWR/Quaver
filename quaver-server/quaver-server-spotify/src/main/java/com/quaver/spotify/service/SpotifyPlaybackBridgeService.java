package com.quaver.spotify.service;

import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.RepeatMode;
import com.quaver.spotify.model.SpotifyDevice;
import java.util.List;

public interface SpotifyPlaybackBridgeService {

    PlaybackStateView getPlaybackState();

    PlaybackStateView startPlayback(
            String trackId,
            String spotifyUri,
            String deviceId,
            List<String> uris,
            String contextUri,
            Integer offsetPosition,
            Integer positionMs
    );

    PlaybackStateView pause(String deviceId);

    PlaybackStateView next(String deviceId);

    PlaybackStateView previous(String deviceId);

    PlaybackStateView seek(int positionMs, String deviceId);

    PlaybackStateView setShuffle(boolean enabled, String deviceId);

    PlaybackStateView setRepeatMode(RepeatMode repeatMode, String deviceId);

    PlaybackStateView setVolume(int volume, String deviceId);

    PlaybackStateView addToQueue(String spotifyUri, String deviceId);

    List<SpotifyDevice> listDevices();

    void addTracksToPlaylist(String playlistId, List<String> uris);
}
