package com.quaver.spotify.controller;

import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.TrackView;
import com.quaver.spotify.dto.SpotifyProfileDto;
import com.quaver.spotify.service.SpotifyLibraryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/spotify")
public class SpotifyLibraryController {

    private final SpotifyLibraryService spotifyLibraryService;

    public SpotifyLibraryController(SpotifyLibraryService spotifyLibraryService) {
        this.spotifyLibraryService = spotifyLibraryService;
    }

    @GetMapping("/me/profile")
    public SpotifyProfileDto profile() {
        return spotifyLibraryService.getProfile();
    }

    @GetMapping("/me/playlists")
    public List<PlaylistView> playlists(@RequestParam(defaultValue = "24") int limit) {
        return spotifyLibraryService.listPlaylists(limit);
    }

    @GetMapping("/playlists/{playlistId}/tracks")
    public List<TrackView> playlistTracks(@PathVariable String playlistId,
                                          @RequestParam(defaultValue = "50") int limit) {
        return spotifyLibraryService.listPlaylistTracks(playlistId, limit);
    }
}
