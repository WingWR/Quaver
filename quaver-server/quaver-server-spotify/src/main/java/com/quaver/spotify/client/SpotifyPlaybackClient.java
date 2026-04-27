package com.quaver.spotify.client;

import com.quaver.common.model.music.RepeatMode;
import com.quaver.spotify.model.SpotifyArtistItem;
import com.quaver.spotify.model.SpotifyDevice;
import com.quaver.spotify.model.SpotifyPlaybackState;
import com.quaver.spotify.model.SpotifyQueueState;
import com.quaver.spotify.model.SpotifyTrackItem;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class SpotifyPlaybackClient {

    private final RestClient restClient;

    public SpotifyPlaybackClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.baseUrl("https://api.spotify.com").build();
    }

    public Optional<SpotifyPlaybackState> fetchPlaybackState(String accessToken) {
        PlaybackResponse response = restClient.get()
                .uri("/v1/me/player")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(PlaybackResponse.class);

        if (response == null) {
            return Optional.empty();
        }
        return Optional.of(new SpotifyPlaybackState(
                response.item() == null ? null : mapTrack(response.item()),
                response.progressMs(),
                response.isPlaying(),
                response.shuffleState(),
                RepeatMode.fromValue(response.repeatState()),
                response.device() == null ? null : response.device().id(),
                response.device() == null ? null : response.device().volumePercent()
        ));
    }

    public SpotifyQueueState fetchQueue(String accessToken) {
        QueueResponse response = restClient.get()
                .uri("/v1/me/player/queue")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(QueueResponse.class);

        if (response == null) {
            return new SpotifyQueueState(null, List.of());
        }
        return new SpotifyQueueState(
                response.currentlyPlaying() == null ? null : mapTrack(response.currentlyPlaying()),
                response.queue() == null ? List.of() : response.queue().stream().map(this::mapTrack).toList()
        );
    }

    public List<SpotifyDevice> fetchDevices(String accessToken) {
        DevicesResponse response = restClient.get()
                .uri("/v1/me/player/devices")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(DevicesResponse.class);

        if (response == null || response.devices() == null) {
            return List.of();
        }
        return response.devices().stream()
                .map(device -> new SpotifyDevice(
                        device.id(),
                        device.name(),
                        device.type(),
                        device.isActive(),
                        device.isRestricted(),
                        device.volumePercent()
                ))
                .toList();
    }

    public void startPlayback(
            String accessToken,
            String deviceId,
            List<String> uris,
            String contextUri,
            Integer offsetPosition,
            Integer positionMs
    ) {
        PlayBody body = new PlayBody(
                blankToNull(contextUri),
                uris == null || uris.isEmpty() ? null : uris,
                offsetPosition == null ? null : new OffsetBody(offsetPosition),
                positionMs
        );
        restClient.put()
                .uri(withOptionalDevice("/v1/me/player/play", deviceId))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    public void pause(String accessToken, String deviceId) {
        restClient.put()
                .uri(withOptionalDevice("/v1/me/player/pause", deviceId))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void next(String accessToken, String deviceId) {
        restClient.post()
                .uri(withOptionalDevice("/v1/me/player/next", deviceId))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void previous(String accessToken, String deviceId) {
        restClient.post()
                .uri(withOptionalDevice("/v1/me/player/previous", deviceId))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void seek(String accessToken, int positionMs, String deviceId) {
        restClient.put()
                .uri(UriComponentsBuilder.fromPath("/v1/me/player/seek")
                        .queryParam("position_ms", positionMs)
                        .queryParamIfPresent("device_id", Optional.ofNullable(blankToNull(deviceId)))
                        .build()
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void setShuffle(String accessToken, boolean enabled, String deviceId) {
        restClient.put()
                .uri(UriComponentsBuilder.fromPath("/v1/me/player/shuffle")
                        .queryParam("state", enabled)
                        .queryParamIfPresent("device_id", Optional.ofNullable(blankToNull(deviceId)))
                        .build()
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void setRepeatMode(String accessToken, RepeatMode repeatMode, String deviceId) {
        restClient.put()
                .uri(UriComponentsBuilder.fromPath("/v1/me/player/repeat")
                        .queryParam("state", repeatMode.getValue())
                        .queryParamIfPresent("device_id", Optional.ofNullable(blankToNull(deviceId)))
                        .build()
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void setVolume(String accessToken, int volumePercent, String deviceId) {
        restClient.put()
                .uri(UriComponentsBuilder.fromPath("/v1/me/player/volume")
                        .queryParam("volume_percent", Math.max(0, Math.min(100, volumePercent)))
                        .queryParamIfPresent("device_id", Optional.ofNullable(blankToNull(deviceId)))
                        .build()
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void addToQueue(String accessToken, String spotifyUri, String deviceId) {
        restClient.post()
                .uri(UriComponentsBuilder.fromPath("/v1/me/player/queue")
                        .queryParam("uri", spotifyUri)
                        .queryParamIfPresent("device_id", Optional.ofNullable(blankToNull(deviceId)))
                        .build()
                        .encode()
                        .toUri())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
    }

    public void addTracksToPlaylist(String accessToken, String playlistId, List<String> uris) {
        restClient.post()
                .uri("/v1/playlists/{playlistId}/tracks", playlistId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new PlaylistTrackBody(uris))
                .retrieve()
                .toBodilessEntity();
    }

    private java.net.URI withOptionalDevice(String path, String deviceId) {
        return UriComponentsBuilder.fromPath(path)
                .queryParamIfPresent("device_id", Optional.ofNullable(blankToNull(deviceId)))
                .build()
                .encode()
                .toUri();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
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

    private record QueueResponse(
            @com.fasterxml.jackson.annotation.JsonProperty("currently_playing") TrackResponse currentlyPlaying,
            List<TrackResponse> queue
    ) {
    }

    private record PlaybackResponse(
            DeviceResponse device,
            TrackResponse item,
            @com.fasterxml.jackson.annotation.JsonProperty("progress_ms") Integer progressMs,
            @com.fasterxml.jackson.annotation.JsonProperty("is_playing") Boolean isPlaying,
            @com.fasterxml.jackson.annotation.JsonProperty("shuffle_state") Boolean shuffleState,
            @com.fasterxml.jackson.annotation.JsonProperty("repeat_state") String repeatState
    ) {
    }

    private record DeviceResponse(
            String id,
            String name,
            String type,
            @com.fasterxml.jackson.annotation.JsonProperty("is_active") Boolean isActive,
            @com.fasterxml.jackson.annotation.JsonProperty("is_restricted") Boolean isRestricted,
            @com.fasterxml.jackson.annotation.JsonProperty("volume_percent") Integer volumePercent
    ) {
    }

    private record DevicesResponse(List<DeviceResponse> devices) {
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

    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_EMPTY)
    private record PlayBody(
            @com.fasterxml.jackson.annotation.JsonProperty("context_uri") String contextUri,
            List<String> uris,
            OffsetBody offset,
            @com.fasterxml.jackson.annotation.JsonProperty("position_ms") Integer positionMs
    ) {
    }

    private record OffsetBody(Integer position) {
    }

    private record PlaylistTrackBody(List<String> uris) {
    }
}
