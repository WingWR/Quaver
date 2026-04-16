package com.quaver.spotify.service.impl;

import com.quaver.common.exception.BusinessException;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.RepeatMode;
import com.quaver.common.model.music.TrackView;
import com.quaver.common.support.MusicProfileSupport;
import com.quaver.spotify.client.SpotifyPlaybackClient;
import com.quaver.spotify.model.SpotifyPlaybackState;
import com.quaver.spotify.model.SpotifyQueueState;
import com.quaver.spotify.model.SpotifyTrackItem;
import com.quaver.spotify.service.SpotifyAuthService;
import com.quaver.spotify.service.SpotifyCatalogService;
import com.quaver.spotify.service.SpotifyPlaybackBridgeService;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class DefaultSpotifyPlaybackBridgeService implements SpotifyPlaybackBridgeService {

    private final SpotifyAuthService spotifyAuthService;
    private final SpotifyPlaybackClient spotifyPlaybackClient;
    private final SpotifyCatalogService spotifyCatalogService;

    public DefaultSpotifyPlaybackBridgeService(
            SpotifyAuthService spotifyAuthService,
            SpotifyPlaybackClient spotifyPlaybackClient,
            SpotifyCatalogService spotifyCatalogService
    ) {
        this.spotifyAuthService = spotifyAuthService;
        this.spotifyPlaybackClient = spotifyPlaybackClient;
        this.spotifyCatalogService = spotifyCatalogService;
    }

    @Override
    public PlaybackStateView getPlaybackState() {
        String token = requireAccessToken();
        SpotifyQueueState queueState = spotifyPlaybackClient.fetchQueue(token);
        SpotifyPlaybackState playbackState = spotifyPlaybackClient.fetchPlaybackState(token).orElse(null);
        return composeState(queueState, playbackState);
    }

    @Override
    public PlaybackStateView startPlayback(
            String trackId,
            String spotifyUri,
            String deviceId,
            List<String> uris,
            String contextUri,
            Integer offsetPosition,
            Integer positionMs
    ) {
        String token = requireAccessToken();
        List<String> nextUris = uris == null ? List.of() : uris;
        if ((nextUris.isEmpty() && (contextUri == null || contextUri.isBlank())) && trackId != null && !trackId.isBlank()) {
            TrackView track = spotifyCatalogService.getTrack(trackId)
                    .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Track not found on Spotify."));
            nextUris = List.of(track.spotifyUri());
        }
        if ((nextUris.isEmpty() && (contextUri == null || contextUri.isBlank())) && spotifyUri != null && !spotifyUri.isBlank()) {
            nextUris = List.of(spotifyUri);
        }
        spotifyPlaybackClient.startPlayback(token, deviceId, nextUris, contextUri, offsetPosition, positionMs);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView pause(String deviceId) {
        spotifyPlaybackClient.pause(requireAccessToken(), deviceId);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView next(String deviceId) {
        spotifyPlaybackClient.next(requireAccessToken(), deviceId);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView previous(String deviceId) {
        spotifyPlaybackClient.previous(requireAccessToken(), deviceId);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView seek(int positionMs, String deviceId) {
        spotifyPlaybackClient.seek(requireAccessToken(), positionMs, deviceId);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView setShuffle(boolean enabled, String deviceId) {
        spotifyPlaybackClient.setShuffle(requireAccessToken(), enabled, deviceId);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView setRepeatMode(RepeatMode repeatMode, String deviceId) {
        spotifyPlaybackClient.setRepeatMode(requireAccessToken(), repeatMode, deviceId);
        return getPlaybackState();
    }

    @Override
    public PlaybackStateView addToQueue(String spotifyUri, String deviceId) {
        spotifyPlaybackClient.addToQueue(requireAccessToken(), spotifyUri, deviceId);
        return getPlaybackState();
    }

    @Override
    public void addTracksToPlaylist(String playlistId, List<String> uris) {
        spotifyPlaybackClient.addTracksToPlaylist(requireAccessToken(), playlistId, uris);
    }

    private PlaybackStateView composeState(SpotifyQueueState queueState, SpotifyPlaybackState playbackState) {
        List<TrackView> queue = new ArrayList<>();
        if (queueState.currentlyPlaying() != null) {
            queue.add(toTrackView(queueState.currentlyPlaying()));
        } else if (playbackState != null && playbackState.currentTrack() != null) {
            queue.add(toTrackView(playbackState.currentTrack()));
        }
        if (queueState.queue() != null) {
            queue.addAll(queueState.queue().stream().map(this::toTrackView).toList());
        }
        return new PlaybackStateView(
                queue,
                0,
                playbackState != null && Boolean.TRUE.equals(playbackState.isPlaying()),
                playbackState != null && playbackState.progressMs() != null ? Math.round(playbackState.progressMs() / 1000.0f) : 0,
                playbackState != null && playbackState.volumePercent() != null ? playbackState.volumePercent() : 72,
                PlaybackSource.SPOTIFY,
                playbackState != null && Boolean.TRUE.equals(playbackState.shuffleEnabled()),
                playbackState != null && playbackState.repeatMode() != null ? playbackState.repeatMode() : RepeatMode.OFF
        );
    }

    private TrackView toTrackView(SpotifyTrackItem item) {
        String artist = item.artists() == null || item.artists().isEmpty()
                ? "Unknown Artist"
                : item.artists().stream().map(artistItem -> artistItem.name()).collect(java.util.stream.Collectors.joining(", "));
        String mood = MusicProfileSupport.inferMood(item.name() + artist);
        String artwork = item.imageUrl() == null || item.imageUrl().isBlank()
                ? MusicProfileSupport.createTrackArtwork(item.name())
                : item.imageUrl();
        return new TrackView(
                "spotify-track-" + item.id(),
                item.name(),
                artist,
                item.albumName() == null ? "Spotify" : item.albumName(),
                item.durationMs() == null ? 0 : Math.round(item.durationMs() / 1000.0f),
                artwork,
                MusicProfileSupport.accentForMood(mood),
                mood,
                List.of(mood, "spotify"),
                PlaybackSource.SPOTIFY,
                item.id(),
                item.uri(),
                item.externalUrl(),
                List.of()
        );
    }

    private String requireAccessToken() {
        return spotifyAuthService.getValidAccessToken()
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST,
                        "Spotify bridge account has not completed authorization yet."));
    }
}
