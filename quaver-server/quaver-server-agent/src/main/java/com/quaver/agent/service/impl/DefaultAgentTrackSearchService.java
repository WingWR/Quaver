package com.quaver.agent.service.impl;

import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;
import com.quaver.agent.ai.AgentAiService;
import com.quaver.common.config.QuaverAiProperties;
import com.quaver.common.model.music.TrackView;
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
    private final AgentAiService agentAiService;
    private final QuaverAiProperties aiProperties;
    private final Clock clock;

    public DefaultAgentTrackSearchService(
            LibraryService libraryService,
            SpotifyCatalogService spotifyCatalogService,
            AgentAiService agentAiService,
            QuaverAiProperties aiProperties,
            Clock clock
    ) {
        this.libraryService = libraryService;
        this.spotifyCatalogService = spotifyCatalogService;
        this.agentAiService = agentAiService;
        this.aiProperties = aiProperties;
        this.clock = clock;
    }

    @Override
    public AgentTrackSearchResponse search(AgentTrackSearchRequest request) {
        Instant start = Instant.now(clock);
        int limit = request.getLimit() == null || request.getLimit() <= 0 ? 8 : request.getLimit();
        String rawQuery = request.getQuery() == null ? "" : request.getQuery().trim();
        String searchQuery = resolveSearchQuery(request, rawQuery);
        String model = request.getModel() == null || request.getModel().isBlank()
                ? aiProperties.getSearchModel()
                : request.getModel();

        Map<String, TrackView> results = new LinkedHashMap<>();
        String warning = null;
        if (!searchQuery.isBlank()) {
            libraryService.searchCachedTracks(searchQuery, limit).forEach(track -> results.put(track.id(), track));

            try {
                libraryService.cacheTracks(spotifyCatalogService.searchTracks(searchQuery, limit))
                        .forEach(track -> results.put(track.id(), track));
            } catch (Exception exception) {
                warning = "Spotify search is unavailable: " + resolveMessage(exception);
            }
        }

        List<TrackView> tracks = results.values().stream().limit(limit).toList();
        String status = tracks.isEmpty() && warning != null ? "error" : tracks.isEmpty() ? "empty" : "ready";
        return new AgentTrackSearchResponse(
                searchQuery,
                tracks,
                tracks.size(),
                model,
                UUID.randomUUID().toString(),
                status,
                java.time.Duration.between(start, Instant.now(clock)).toMillis(),
                tracks.isEmpty() ? warning : null
        );
    }

    private String resolveSearchQuery(AgentTrackSearchRequest request, String rawQuery) {
        String normalized = agentAiService.normalizeSearchQuery(request);
        if (normalized == null || normalized.isBlank()) {
            return rawQuery;
        }
        return normalized.trim();
    }

    private String resolveMessage(Exception exception) {
        if (exception.getMessage() == null || exception.getMessage().isBlank()) {
            return "remote Spotify request failed";
        }
        return exception.getMessage();
    }
}
