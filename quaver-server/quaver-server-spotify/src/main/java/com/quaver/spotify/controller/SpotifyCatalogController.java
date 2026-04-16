package com.quaver.spotify.controller;

import com.quaver.common.model.music.TrackView;
import com.quaver.spotify.service.SpotifyCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/spotify")
public class SpotifyCatalogController {

    private final SpotifyCatalogService spotifyCatalogService;

    public SpotifyCatalogController(SpotifyCatalogService spotifyCatalogService) {
        this.spotifyCatalogService = spotifyCatalogService;
    }

    @GetMapping("/tracks/search")
    public List<TrackView> searchTracks(@RequestParam("q") String query,
                                        @RequestParam(defaultValue = "8") int limit) {
        return spotifyCatalogService.searchTracks(query, limit);
    }

    @GetMapping("/tracks/{trackId}")
    public TrackView getTrack(@PathVariable String trackId) {
        return spotifyCatalogService.getTrack(trackId).orElse(null);
    }
}
