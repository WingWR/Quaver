package com.quaver.spotify.controller;

import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.RepeatMode;
import com.quaver.spotify.dto.SpotifyPlaybackCommandRequest;
import com.quaver.spotify.dto.SpotifyPlaylistMutationRequest;
import com.quaver.spotify.dto.SpotifyQueueCommandRequest;
import com.quaver.spotify.dto.SpotifyRepeatModeRequest;
import com.quaver.spotify.dto.SpotifySeekRequest;
import com.quaver.spotify.dto.SpotifyShuffleRequest;
import com.quaver.spotify.service.SpotifyPlaybackBridgeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/spotify/playback")
public class SpotifyPlaybackController {

    private final SpotifyPlaybackBridgeService spotifyPlaybackBridgeService;

    public SpotifyPlaybackController(SpotifyPlaybackBridgeService spotifyPlaybackBridgeService) {
        this.spotifyPlaybackBridgeService = spotifyPlaybackBridgeService;
    }

    @GetMapping("/state")
    public PlaybackStateView state() {
        return spotifyPlaybackBridgeService.getPlaybackState();
    }

    @PostMapping("/play")
    public PlaybackStateView play(@RequestBody SpotifyPlaybackCommandRequest request) {
        return spotifyPlaybackBridgeService.startPlayback(
                request.getTrackId(),
                request.getSpotifyUri(),
                request.getDeviceId(),
                request.getUris(),
                request.getContextUri(),
                request.getOffsetPosition(),
                request.getPositionMs()
        );
    }

    @PostMapping("/pause")
    public PlaybackStateView pause(@RequestBody(required = false) SpotifyPlaybackCommandRequest request) {
        return spotifyPlaybackBridgeService.pause(request == null ? null : request.getDeviceId());
    }

    @PostMapping("/next")
    public PlaybackStateView next(@RequestBody(required = false) SpotifyPlaybackCommandRequest request) {
        return spotifyPlaybackBridgeService.next(request == null ? null : request.getDeviceId());
    }

    @PostMapping("/previous")
    public PlaybackStateView previous(@RequestBody(required = false) SpotifyPlaybackCommandRequest request) {
        return spotifyPlaybackBridgeService.previous(request == null ? null : request.getDeviceId());
    }

    @PostMapping("/seek")
    public PlaybackStateView seek(@RequestBody SpotifySeekRequest request) {
        return spotifyPlaybackBridgeService.seek(request.getPositionMs(), request.getDeviceId());
    }

    @PostMapping("/shuffle")
    public PlaybackStateView shuffle(@RequestBody SpotifyShuffleRequest request) {
        return spotifyPlaybackBridgeService.setShuffle(request.isEnabled(), request.getDeviceId());
    }

    @PostMapping("/repeat")
    public PlaybackStateView repeat(@RequestBody SpotifyRepeatModeRequest request) {
        return spotifyPlaybackBridgeService.setRepeatMode(RepeatMode.fromValue(request.getMode()), request.getDeviceId());
    }

    @PostMapping("/queue")
    public PlaybackStateView queue(@RequestBody SpotifyQueueCommandRequest request) {
        return spotifyPlaybackBridgeService.addToQueue(request.getSpotifyUri(), request.getDeviceId());
    }

    @PostMapping("/playlists/{playlistId}/tracks")
    public void addTracksToPlaylist(@PathVariable String playlistId,
                                    @RequestBody SpotifyPlaylistMutationRequest request) {
        spotifyPlaybackBridgeService.addTracksToPlaylist(playlistId, request.getUris());
    }
}
