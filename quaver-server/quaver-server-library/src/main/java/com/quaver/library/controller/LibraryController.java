package com.quaver.library.controller;

import com.quaver.library.dto.LibraryBootstrapResponse;
import com.quaver.library.dto.LibraryMutationResponse;
import com.quaver.library.dto.PlaybackStartRequest;
import com.quaver.library.dto.PlaybackStateUpdateRequest;
import com.quaver.library.dto.PlaylistTrackMutationRequest;
import com.quaver.library.dto.QueueMutationRequest;
import com.quaver.library.service.LibraryService;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.RepeatMode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/library")
public class LibraryController {

    private final LibraryService libraryService;

    public LibraryController(LibraryService libraryService) {
        this.libraryService = libraryService;
    }

    @GetMapping("/bootstrap")
    public LibraryBootstrapResponse bootstrap() {
        return libraryService.bootstrap();
    }

    @PostMapping("/queue")
    public LibraryMutationResponse appendToQueue(@RequestBody QueueMutationRequest request) {
        return libraryService.appendTrackToQueue(request.getTrackId());
    }

    @PostMapping("/queue/next")
    public LibraryMutationResponse insertNext(@RequestBody QueueMutationRequest request) {
        return libraryService.insertTrackNext(request.getTrackId());
    }

    @PostMapping("/playback/start")
    public LibraryMutationResponse startPlayback(@RequestBody PlaybackStartRequest request) {
        PlaybackStateView playback = libraryService.startPlayback(
                request.getTracks(),
                request.getStartIndex() == null ? 0 : request.getStartIndex(),
                PlaybackSource.fromValue(request.getPlaybackSource())
        );
        return new LibraryMutationResponse(true, "Playback session started.", playback, null);
    }

    @PatchMapping("/playback/state")
    public LibraryMutationResponse updatePlaybackState(@RequestBody PlaybackStateUpdateRequest request) {
        PlaybackStateView playback = libraryService.updatePlaybackState(
                request.getCurrentTrackIndex(),
                request.getIsPlaying(),
                request.getProgress(),
                request.getVolume(),
                request.getPlaybackSource() == null ? null : PlaybackSource.fromValue(request.getPlaybackSource()),
                request.getIsShuffleEnabled(),
                request.getRepeatMode() == null ? null : RepeatMode.fromValue(request.getRepeatMode())
        );
        return new LibraryMutationResponse(true, "Playback session updated.", playback, null);
    }

    @PostMapping("/playlists/{playlistId}/tracks")
    public LibraryMutationResponse addTrackToPlaylist(@PathVariable String playlistId,
                                                      @RequestBody PlaylistTrackMutationRequest request) {
        return libraryService.addTrackToPlaylist(playlistId, request.getTrackId());
    }
}
