package com.quaver.agent.service.impl;

import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;
import com.quaver.agent.service.AgentTrackSearchService;
import com.quaver.library.service.LibraryService;
import com.quaver.spotify.service.SpotifyCatalogService;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DefaultAgentTrackSearchService implements AgentTrackSearchService {

    private final LibraryService libraryService;
    private final SpotifyCatalogService spotifyCatalogService;
    private final Clock clock;

    public DefaultAgentTrackSearchService(
            LibraryService libraryService,
            SpotifyCatalogService spotifyCatalogService,
            Clock clock
    ) {
        this.libraryService = libraryService;
        this.spotifyCatalogService = spotifyCatalogService;
        this.clock = clock;
    }

    @Override
    public AgentTrackSearchResponse search(AgentTrackSearchRequest request) {
        Instant start = Instant.now(clock);
        int limit = request.getLimit() == null || request.getLimit() <= 0 ? 8 : request.getLimit();

        Map<String, com.quaver.common.model.music.TrackView> results = new LinkedHashMap<>();
        libraryService.searchCachedTracks(request.getQuery(), limit).forEach(track -> results.put(track.id(), track));

        try {
            libraryService.cacheTracks(spotifyCatalogService.searchTracks(request.getQuery(), limit))
                    .forEach(track -> results.put(track.id(), track));
        } catch (Exception ignored) {
            // Spotify bridge can be unavailable during local development; cached search remains available.
        }

        List<com.quaver.common.model.music.TrackView> tracks = results.values().stream().limit(limit).toList();
        return new AgentTrackSearchResponse(
                request.getQuery(),
                tracks,
                tracks.size(),
                request.getModel(),
                UUID.randomUUID().toString(),
                tracks.isEmpty() ? "empty" : "ready",
                java.time.Duration.between(start, Instant.now(clock)).toMillis()
        );
    }
}
