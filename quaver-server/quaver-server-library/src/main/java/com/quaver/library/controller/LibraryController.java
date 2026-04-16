package com.quaver.library.controller;

import com.quaver.library.dto.LibraryBootstrapResponse;
import com.quaver.library.dto.LibraryMutationResponse;
import com.quaver.library.dto.PlaylistTrackMutationRequest;
import com.quaver.library.dto.QueueMutationRequest;
import com.quaver.library.service.LibraryService;
import org.springframework.web.bind.annotation.GetMapping;
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

    @PostMapping("/playlists/{playlistId}/tracks")
    public LibraryMutationResponse addTrackToPlaylist(@PathVariable String playlistId,
                                                      @RequestBody PlaylistTrackMutationRequest request) {
        return libraryService.addTrackToPlaylist(playlistId, request.getTrackId());
    }
}
