package com.quaver.spotify.service.impl;

import com.quaver.common.exception.BusinessException;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.TrackView;
import com.quaver.common.support.MusicProfileSupport;
import com.quaver.spotify.client.SpotifyCatalogClient;
import com.quaver.spotify.model.SpotifyTrackItem;
import com.quaver.spotify.service.SpotifyAuthService;
import com.quaver.spotify.service.SpotifyCatalogService;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class DefaultSpotifyCatalogService implements SpotifyCatalogService {

    private final SpotifyAuthService spotifyAuthService;
    private final SpotifyCatalogClient spotifyCatalogClient;

    public DefaultSpotifyCatalogService(SpotifyAuthService spotifyAuthService, SpotifyCatalogClient spotifyCatalogClient) {
        this.spotifyAuthService = spotifyAuthService;
        this.spotifyCatalogClient = spotifyCatalogClient;
    }

    @Override
    public List<TrackView> searchTracks(String query, int limit) {
        String token = requireAccessToken();
        return spotifyCatalogClient.searchTracks(token, query, limit).stream()
                .map(this::toTrackView)
                .toList();
    }

    @Override
    public Optional<TrackView> getTrack(String trackId) {
        String token = requireAccessToken();
        return spotifyCatalogClient.getTrack(token, normalizeSpotifyTrackId(trackId)).map(this::toTrackView);
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

    private String normalizeSpotifyTrackId(String trackId) {
        if (trackId == null || trackId.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify track id is required.");
        }
        return trackId.startsWith("spotify-track-") ? trackId.substring("spotify-track-".length()) : trackId;
    }
}
