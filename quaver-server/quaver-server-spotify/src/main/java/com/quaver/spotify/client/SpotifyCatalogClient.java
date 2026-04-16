package com.quaver.spotify.client;

import com.quaver.spotify.model.SpotifyArtistItem;
import com.quaver.spotify.model.SpotifyTrackItem;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class SpotifyCatalogClient {

    private final RestClient restClient;

    public SpotifyCatalogClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.baseUrl("https://api.spotify.com/v1").build();
    }

    public List<SpotifyTrackItem> searchTracks(String accessToken, String query, int limit) {
        SearchResponse response = restClient.get()
                .uri(UriComponentsBuilder.fromPath("/search")
                        .queryParam("q", query)
                        .queryParam("type", "track")
                        .queryParam("limit", limit)
                        .build(true)
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(SearchResponse.class);

        if (response == null || response.tracks() == null || response.tracks().items() == null) {
            return List.of();
        }
        return response.tracks().items().stream().map(this::mapTrack).toList();
    }

    public Optional<SpotifyTrackItem> getTrack(String accessToken, String spotifyTrackId) {
        TrackResponse response = restClient.get()
                .uri("/tracks/{id}", spotifyTrackId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(TrackResponse.class);
        return Optional.ofNullable(response).map(this::mapTrack);
    }

    private SpotifyTrackItem mapTrack(TrackResponse response) {
        return new SpotifyTrackItem(
                response.id(),
                response.name(),
                response.album() == null ? null : response.album().name(),
                response.durationMs(),
                response.firstImageUrl(),
                response.uri(),
                response.externalUrls() == null ? null : response.externalUrls().spotify(),
                response.artists() == null
                        ? List.of()
                        : response.artists().stream()
                        .map(artist -> new SpotifyArtistItem(artist.id(), artist.name()))
                        .toList()
        );
    }

    private record SearchResponse(TracksPage tracks) {
    }

    private record TracksPage(List<TrackResponse> items) {
    }

    private record TrackResponse(
            String id,
            String name,
            AlbumResponse album,
            List<ArtistResponse> artists,
            String uri,
            ExternalUrls externalUrls,
            @com.fasterxml.jackson.annotation.JsonProperty("duration_ms") Integer durationMs
    ) {
        public String firstImageUrl() {
            if (album == null || album.images() == null || album.images().isEmpty()) {
                return null;
            }
            return album.images().getFirst().url();
        }
    }

    private record AlbumResponse(String name, List<ImageResponse> images) {
    }

    private record ImageResponse(String url) {
    }

    private record ArtistResponse(String id, String name) {
    }

    private record ExternalUrls(String spotify) {
    }
}
