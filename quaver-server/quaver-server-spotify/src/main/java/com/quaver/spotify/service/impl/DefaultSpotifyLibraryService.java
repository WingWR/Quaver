package com.quaver.spotify.service.impl;

import com.quaver.common.exception.BusinessException;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.TrackView;
import com.quaver.common.support.MusicProfileSupport;
import com.quaver.spotify.client.SpotifyCatalogClient;
import com.quaver.spotify.dto.SpotifyProfileDto;
import com.quaver.spotify.model.SpotifyPlaylistItem;
import com.quaver.spotify.model.SpotifyProfile;
import com.quaver.spotify.model.SpotifyTrackItem;
import com.quaver.spotify.service.SpotifyAuthService;
import com.quaver.spotify.service.SpotifyLibraryService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class DefaultSpotifyLibraryService implements SpotifyLibraryService {

    private final SpotifyAuthService spotifyAuthService;
    private final SpotifyCatalogClient spotifyCatalogClient;

    public DefaultSpotifyLibraryService(
            SpotifyAuthService spotifyAuthService,
            SpotifyCatalogClient spotifyCatalogClient
    ) {
        this.spotifyAuthService = spotifyAuthService;
        this.spotifyCatalogClient = spotifyCatalogClient;
    }

    @Override
    public SpotifyProfileDto getProfile() {
        SpotifyProfile profile = spotifyCatalogClient.fetchProfile(requireUserAccessToken());
        return new SpotifyProfileDto(profile.displayName(), profile.email(), profile.imageUrl());
    }

    @Override
    public List<PlaylistView> listPlaylists(int limit) {
        return spotifyCatalogClient.fetchPlaylists(requireUserAccessToken(), clampLimit(limit, 50)).stream()
                .map(this::toPlaylistView)
                .toList();
    }

    @Override
    public List<TrackView> listPlaylistTracks(String playlistId, int limit) {
        return spotifyCatalogClient.fetchPlaylistTracks(requireUserAccessToken(), normalizePlaylistId(playlistId), clampLimit(limit, 100)).stream()
                .map(this::toTrackView)
                .toList();
    }

    private PlaylistView toPlaylistView(SpotifyPlaylistItem item) {
        String cover = item.imageUrl() == null || item.imageUrl().isBlank()
                ? MusicProfileSupport.createTrackArtwork(item.name())
                : item.imageUrl();
        return new PlaylistView(
                "spotify-playlist-" + item.id(),
                item.name(),
                stripHtml(item.description()),
                cover,
                "#1DB954",
                List.of(),
                PlaybackSource.SPOTIFY,
                item.id(),
                item.uri(),
                item.ownerName()
        );
    }

    private TrackView toTrackView(SpotifyTrackItem item) {
        String artist = item.artists() == null || item.artists().isEmpty()
                ? "Unknown Artist"
                : item.artists().stream()
                .map(artistItem -> artistItem.name())
                .collect(java.util.stream.Collectors.joining(", "));
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

    private String requireUserAccessToken() {
        return spotifyAuthService.getValidAccessToken()
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST,
                        "Spotify bridge account has not completed authorization yet."));
    }

    private int clampLimit(int limit, int max) {
        return Math.max(1, Math.min(limit, max));
    }

    private String normalizePlaylistId(String playlistId) {
        if (playlistId == null || playlistId.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify playlist id is required.");
        }
        return playlistId.startsWith("spotify-playlist-") ? playlistId.substring("spotify-playlist-".length()) : playlistId;
    }

    private String stripHtml(String value) {
        if (value == null || value.isBlank()) {
            return "Imported from your Spotify library.";
        }
        return value.replaceAll("<[^>]+>", "").trim();
    }
}
