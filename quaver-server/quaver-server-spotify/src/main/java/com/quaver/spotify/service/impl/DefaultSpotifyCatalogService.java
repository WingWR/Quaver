package com.quaver.spotify.service.impl;

import com.quaver.common.exception.BusinessException;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.TrackView;
import com.quaver.common.support.MusicProfileSupport;
import com.quaver.spotify.client.SpotifyCatalogClient;
import com.quaver.spotify.config.SpotifyProperties;
import com.quaver.spotify.model.SpotifyTrackItem;
import com.quaver.spotify.service.SpotifyAuthService;
import com.quaver.spotify.service.SpotifyCatalogService;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;

@Service
public class DefaultSpotifyCatalogService implements SpotifyCatalogService {

    private final SpotifyAuthService spotifyAuthService;
    private final SpotifyCatalogClient spotifyCatalogClient;
    private final SpotifyProperties spotifyProperties;

    public DefaultSpotifyCatalogService(
            SpotifyAuthService spotifyAuthService,
            SpotifyCatalogClient spotifyCatalogClient,
            SpotifyProperties spotifyProperties
    ) {
        this.spotifyAuthService = spotifyAuthService;
        this.spotifyCatalogClient = spotifyCatalogClient;
        this.spotifyProperties = spotifyProperties;
    }

    @Override
    public List<TrackView> searchTracks(String query, int limit) {
        return searchTracks(query, limit, 0);
    }

    @Override
    public List<TrackView> searchTracks(String query, int limit, int offset) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        SearchAccess searchAccess = resolveSearchAccess();
        int safeLimit = Math.max(1, Math.min(limit, 10));
        String normalizedQuery = query.trim();
        int safeOffset = Math.max(0, offset);

        try {
            return searchTracks(searchAccess.accessToken(), normalizedQuery, safeLimit, safeOffset, searchAccess.market());
        } catch (RestClientResponseException exception) {
            if (!isInvalidLimit(exception)) {
                throw exception;
            }

            int fallbackLimit = Math.min(safeLimit, 8);
            String fallbackMarket = normalizeMarket(spotifyProperties.getSearchMarket());
            if (searchAccess.accessToken().equals(requireCatalogAccessToken()) && fallbackMarket.equals(searchAccess.market())) {
                return searchTracks(searchAccess.accessToken(), normalizedQuery, fallbackLimit, safeOffset, fallbackMarket);
            }

            return searchTracks(requireCatalogAccessToken(), normalizedQuery, fallbackLimit, safeOffset, fallbackMarket);
        }
    }

    @Override
    public Optional<TrackView> getTrack(String trackId) {
        String token = requireCatalogAccessToken();
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

    private String requireCatalogAccessToken() {
        return spotifyAuthService.getCatalogAccessToken()
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST,
                        "Spotify API credentials are not configured."));
    }

    private String normalizeSpotifyTrackId(String trackId) {
        if (trackId == null || trackId.isBlank()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify track id is required.");
        }
        return trackId.startsWith("spotify-track-") ? trackId.substring("spotify-track-".length()) : trackId;
    }

    private SearchAccess resolveSearchAccess() {
        Optional<String> bridgeToken = spotifyAuthService.getValidAccessToken();
        if (bridgeToken.isPresent()) {
            return new SearchAccess(bridgeToken.get(), "from_token");
        }
        return new SearchAccess(requireCatalogAccessToken(), normalizeMarket(spotifyProperties.getSearchMarket()));
    }

    private String normalizeMarket(String market) {
        if (market == null || market.isBlank()) {
            return "US";
        }
        return market.trim().toUpperCase();
    }

    private List<TrackView> searchTracks(String accessToken, String query, int limit, int offset, String market) {
        return spotifyCatalogClient.searchTracks(accessToken, query, limit, offset, market).stream()
                .map(this::toTrackView)
                .toList();
    }

    private boolean isInvalidLimit(RestClientResponseException exception) {
        if (exception.getStatusCode() != HttpStatus.BAD_REQUEST) {
            return false;
        }

        String responseBody = exception.getResponseBodyAsString();
        return responseBody != null && responseBody.contains("Invalid limit");
    }

    private record SearchAccess(String accessToken, String market) {
    }

}
