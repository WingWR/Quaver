package com.quaver.spotify.client;

import com.quaver.spotify.model.SpotifyArtistItem;
import com.quaver.spotify.model.SpotifyPlaylistItem;
import com.quaver.spotify.model.SpotifyProfile;
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
        this.restClient = restClientBuilder.baseUrl("https://api.spotify.com").build();
    }

    public List<SpotifyTrackItem> searchTracks(String accessToken, String query, int limit) {
        return searchTracks(accessToken, query, limit, 0, null);
    }

    public List<SpotifyTrackItem> searchTracks(String accessToken, String query, int limit, int offset) {
        return searchTracks(accessToken, query, limit, offset, null);
    }

    public List<SpotifyTrackItem> searchTracks(String accessToken, String query, int limit, int offset, String market) {
        SearchResponse response = restClient.get()
                .uri(UriComponentsBuilder.fromPath("/v1/search")
                        .queryParam("q", query)
                        .queryParam("type", "track")
                        .queryParam("limit", limit)
                        .queryParam("offset", Math.max(0, offset))
                        .queryParamIfPresent("market", Optional.ofNullable(market).filter(value -> !value.isBlank()))
                        .build()
                        .encode()
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
                .uri("/v1/tracks/{id}", spotifyTrackId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(TrackResponse.class);
        return Optional.ofNullable(response).map(this::mapTrack);
    }

    public SpotifyProfile fetchProfile(String accessToken) {
        ProfileResponse response = restClient.get()
                .uri("/v1/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(ProfileResponse.class);

        if (response == null) {
            return new SpotifyProfile(null, null, null);
        }

        return new SpotifyProfile(
                response.displayName(),
                response.email(),
                firstImageUrl(response.images())
        );
    }

    public List<SpotifyPlaylistItem> fetchPlaylists(String accessToken, int limit) {
        PlaylistPageResponse response = restClient.get()
                .uri(UriComponentsBuilder.fromPath("/v1/me/playlists")
                        .queryParam("limit", limit)
                        .build()
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(PlaylistPageResponse.class);

        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .map(playlist -> new SpotifyPlaylistItem(
                        playlist.id(),
                        playlist.name(),
                        playlist.description(),
                        firstImageUrl(playlist.images()),
                        playlist.uri(),
                        playlist.owner() == null ? null : playlist.owner().displayName()
                ))
                .toList();
    }

    public List<SpotifyTrackItem> fetchPlaylistTracks(String accessToken, String playlistId, int limit) {
        PlaylistTrackPageResponse response = restClient.get()
                .uri(UriComponentsBuilder.fromPath("/v1/playlists/{playlistId}/tracks")
                        .queryParam("market", "from_token")
                        .queryParam("limit", limit)
                        .buildAndExpand(playlistId)
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(PlaylistTrackPageResponse.class);

        if (response == null || response.items() == null) {
            return List.of();
        }

        return response.items().stream()
                .map(PlaylistTrackItemResponse::track)
                .filter(track -> track != null && track.id() != null)
                .map(this::mapTrack)
                .toList();
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

    private String firstImageUrl(List<ImageResponse> images) {
        if (images == null || images.isEmpty()) {
            return null;
        }
        return images.getFirst().url();
    }

    private record SearchResponse(TracksPage tracks) {
    }

    private record TracksPage(List<TrackResponse> items) {
    }

    private record ProfileResponse(
            @com.fasterxml.jackson.annotation.JsonProperty("display_name") String displayName,
            String email,
            List<ImageResponse> images
    ) {
    }

    private record PlaylistPageResponse(List<PlaylistResponse> items) {
    }

    private record PlaylistTrackPageResponse(List<PlaylistTrackItemResponse> items) {
    }

    private record PlaylistTrackItemResponse(TrackResponse track) {
    }

    private record PlaylistResponse(
            String id,
            String name,
            String description,
            List<ImageResponse> images,
            String uri,
            OwnerResponse owner
    ) {
    }

    private record OwnerResponse(@com.fasterxml.jackson.annotation.JsonProperty("display_name") String displayName) {
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
