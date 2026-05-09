package com.quaver.agent.service.impl;

import com.quaver.agent.ai.AgentAiService;
import com.quaver.agent.dto.AgentConversationDto;
import com.quaver.agent.dto.AgentConversationPayload;
import com.quaver.agent.dto.AgentMessageDto;
import com.quaver.agent.dto.AgentOperationDto;
import com.quaver.agent.dto.AgentRuntimeStatusDto;
import com.quaver.agent.dto.AgentStreamEventDto;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;
import com.quaver.agent.dto.CreateAgentConversationRequest;
import com.quaver.agent.dto.SendAgentMessageRequest;
import com.quaver.agent.dto.SendAgentMessageResponse;
import com.quaver.agent.model.ParsedAgentCommand;
import com.quaver.agent.service.AgentCommandPlanner;
import com.quaver.agent.service.AgentConversationService;
import com.quaver.agent.service.AgentTrackSearchService;
import com.quaver.common.config.QuaverAiProperties;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.TrackView;
import com.quaver.library.dto.LibraryMutationResponse;
import com.quaver.library.service.LibraryService;
import com.quaver.spotify.config.SpotifyProperties;
import com.quaver.spotify.service.SpotifyAuthService;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class DefaultAgentConversationService implements AgentConversationService {

    private static final String TRANSIENT_CONVERSATION_ID = "transient-agent-session";
    private static final String SELECTION_SINGLE = "single";

    private final AgentCommandPlanner agentCommandPlanner;
    private final AgentTrackSearchService agentTrackSearchService;
    private final AgentAiService agentAiService;
    private final LibraryService libraryService;
    private final QuaverAiProperties aiProperties;
    private final SpotifyProperties spotifyProperties;
    private final SpotifyAuthService spotifyAuthService;
    private final Clock clock;

    public DefaultAgentConversationService(
            AgentCommandPlanner agentCommandPlanner,
            AgentTrackSearchService agentTrackSearchService,
            AgentAiService agentAiService,
            LibraryService libraryService,
            QuaverAiProperties aiProperties,
            SpotifyProperties spotifyProperties,
            SpotifyAuthService spotifyAuthService,
            Clock clock
    ) {
        this.agentCommandPlanner = agentCommandPlanner;
        this.agentTrackSearchService = agentTrackSearchService;
        this.agentAiService = agentAiService;
        this.libraryService = libraryService;
        this.aiProperties = aiProperties;
        this.spotifyProperties = spotifyProperties;
        this.spotifyAuthService = spotifyAuthService;
        this.clock = clock;
    }

    @Override
    public AgentConversationPayload getDefaultConversation() {
        return new AgentConversationPayload(createConversationDto(null, null), List.of());
    }

    @Override
    public AgentConversationPayload createConversation(CreateAgentConversationRequest request) {
        return new AgentConversationPayload(
                createConversationDto(
                        request == null ? null : request.getTitle(),
                        request == null ? null : request.getModel()
                ),
                List.of()
        );
    }

    @Override
    public SendAgentMessageResponse sendMessage(String conversationId, SendAgentMessageRequest request) {
        String assistantModel = resolveAgentModel(request.getModel(), null);
        AgentConversationDto conversation = createConversationDto(null, assistantModel);
        ParsedAgentCommand command = agentCommandPlanner.plan(request);
        AgentActionResult actionResult = executeAgentAction(command, request);
        String assistantReply = agentAiService.composeAgentReply(
                request.getContent(),
                command,
                actionResult.reply(),
                assistantModel
        );

        String now = LocalDateTime.now(clock).toString();
        AgentMessageDto userMessage = new AgentMessageDto(
                "local-user-" + UUID.randomUUID(),
                resolveConversationId(conversationId),
                "user",
                request.getContent(),
                now,
                "completed",
                assistantModel,
                List.of(operation("status", "Message received", "Handled in transient mode; not saved to MySQL.", "completed")),
                request.getMetadata()
        );
        AgentMessageDto assistantMessage = new AgentMessageDto(
                "local-assistant-" + UUID.randomUUID(),
                resolveConversationId(conversationId),
                "assistant",
                assistantReply,
                LocalDateTime.now(clock).toString(),
                "completed",
                assistantModel,
                buildOperations(command),
                assistantMetadata(command, actionResult)
        );

        return new SendAgentMessageResponse(conversation, userMessage, assistantMessage, null, actionResult.libraryMutation());
    }

    @Override
    public SseEmitter streamMessage(String conversationId, SendAgentMessageRequest request) {
        SseEmitter emitter = new SseEmitter(180_000L);
        CompletableFuture.runAsync(() -> streamMessageInternal(emitter, conversationId, request));
        return emitter;
    }

    @Override
    public AgentRuntimeStatusDto getRuntimeStatus() {
        return new AgentRuntimeStatusDto(
                aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank(),
                aiProperties.getAgentModel(),
                aiProperties.getSearchModel(),
                aiProperties.getAgentModel(),
                aiProperties.getBaseUrl(),
                spotifyProperties.isEnabled(),
                isSpotifyBridgeAuthorized()
        );
    }

    private void streamMessageInternal(SseEmitter emitter, String conversationId, SendAgentMessageRequest request) {
        String assistantModel = resolveAgentModel(request.getModel(), null);
        AgentConversationDto conversation = createConversationDto(null, assistantModel);
        String resolvedConversationId = resolveConversationId(conversationId);
        String now = LocalDateTime.now(clock).toString();
        AgentMessageDto userMessage = new AgentMessageDto(
                "local-user-" + UUID.randomUUID(),
                resolvedConversationId,
                "user",
                request.getContent(),
                now,
                "completed",
                assistantModel,
                List.of(operation("status", "Message received", "Streaming response started.", "completed")),
                request.getMetadata()
        );

        try {
            emit(emitter, "user_message", AgentStreamEventDto.builder()
                    .type("user_message")
                    .message(userMessage)
                    .build());

            ParsedAgentCommand command = agentCommandPlanner.plan(request);
            AgentActionResult actionResult = executeAgentAction(command, request);
            List<AgentOperationDto> operations = buildOperations(command);
            for (AgentOperationDto operation : operations) {
                emit(emitter, "operation", AgentStreamEventDto.builder()
                        .type("operation")
                        .operation(operation)
                        .build());
            }

            String assistantMessageId = "local-assistant-" + UUID.randomUUID();
            AgentMessageDto assistantStart = new AgentMessageDto(
                    assistantMessageId,
                    resolvedConversationId,
                    "assistant",
                    "",
                    LocalDateTime.now(clock).toString(),
                    "running",
                    assistantModel,
                    operations,
                    assistantMetadata(command, actionResult)
            );
            emit(emitter, "assistant_message_start", AgentStreamEventDto.builder()
                    .type("assistant_message_start")
                    .message(assistantStart)
                    .build());

            String assistantReply = agentAiService.streamAgentReply(
                    request.getContent(),
                    command,
                    actionResult.reply(),
                    assistantModel,
                    delta -> emitUnchecked(emitter, "assistant_delta", AgentStreamEventDto.builder()
                            .type("assistant_delta")
                            .delta(delta)
                            .build())
            );

            AgentMessageDto assistantMessage = new AgentMessageDto(
                    assistantMessageId,
                    resolvedConversationId,
                    "assistant",
                    assistantReply,
                    LocalDateTime.now(clock).toString(),
                    "completed",
                    assistantModel,
                    operations,
                    assistantMetadata(command, actionResult)
            );
            SendAgentMessageResponse response = new SendAgentMessageResponse(
                    conversation,
                    userMessage,
                    assistantMessage,
                    null,
                    actionResult.libraryMutation()
            );

            emit(emitter, "assistant_message_done", AgentStreamEventDto.builder()
                    .type("assistant_message_done")
                    .message(assistantMessage)
                    .build());
            emit(emitter, "final", AgentStreamEventDto.builder()
                    .type("final")
                    .response(response)
                    .build());
            emitter.complete();
        } catch (AgentStreamSendException exception) {
            emitter.completeWithError(exception.getCause() == null ? exception : exception.getCause());
        } catch (Exception exception) {
            emitError(emitter, exception);
            emitter.complete();
        }
    }

    private AgentActionResult executeAgentAction(ParsedAgentCommand command, SendAgentMessageRequest request) {
        return switch (command.intent()) {
            case SEARCH -> {
                AgentTrackSearchResponse response = searchTracks(command.query(), request, 12);
                if (response.getTracks().isEmpty()) {
                    yield result("I parsed this as a search request, but there are no matching tracks in the current cache or Spotify bridge.");
                }
                String topTitles = response.getTracks().stream().limit(3).map(TrackView::title).reduce((left, right) -> left + ", " + right).orElse("");
                yield result(
                        "I parsed this as a search request and found " + response.getTracks().size()
                                + " visible candidate tracks. Top results: " + topTitles + ".",
                        null,
                        trackCards("Search results", response.getTracks())
                );
            }
            case PLAY -> {
                AgentTrackSearchResponse response = searchTracks(
                        command.query().isBlank() ? request.getContent() : command.query(),
                        request,
                        playbackSearchLimit(command)
                );
                if (response.getTracks().isEmpty()) {
                    yield result("I parsed this as a play command, but I could not find a playable track yet.");
                }
                PlaybackStateView playback = libraryService.startPlayback(response.getTracks(), 0,
                        response.getTracks().getFirst().source() == PlaybackSource.SPOTIFY ? PlaybackSource.SPOTIFY : PlaybackSource.BACKEND);
                yield result(
                        "I parsed this as a play command and loaded " + response.getTracks().size()
                                + " track(s) into the queue. Playback session state has been updated on the backend.",
                        playbackMutation("Playback session started.", playback),
                        playbackMetadata("start", playback, response.getTracks())
                );
            }
            case PLAY_PLAYLIST -> {
                PlaylistView playlist = findPlaylist(command.query(), request);
                if (playlist == null) {
                    yield result("I parsed this as a playlist playback request, but I could not find that playlist.");
                }
                if (playlist.tracks().isEmpty()) {
                    yield result("I found playlist \"" + playlist.name() + "\", but it has no tracks to play yet.");
                }
                PlaybackStateView playback = libraryService.startPlayback(
                        playlist.tracks(),
                        0,
                        playlist.source() == PlaybackSource.SPOTIFY ? PlaybackSource.SPOTIFY : PlaybackSource.BACKEND
                );
                yield result(
                        "I loaded playlist \"" + playlist.name() + "\" with " + playlist.tracks().size()
                                + " track(s) into the queue and started playback.",
                        playbackMutation("Playlist playback started.", playback),
                        playbackMetadata("start", playback, playlist.tracks())
                );
            }
            case PAUSE -> {
                PlaybackStateView playback = libraryService.updatePlaybackState(null, false, null, null, null, null, null);
                yield result(
                        "Playback has been paused in the backend session.",
                        playbackMutation("Playback paused.", playback),
                        playbackMetadata("pause", playback, List.of())
                );
            }
            case NEXT -> movePlaybackBy(1, "next");
            case PREVIOUS -> movePlaybackBy(-1, "previous");
            case LIST_PLAYLISTS -> {
                List<PlaylistView> playlists = libraryService.listPlaylists();
                if (playlists.isEmpty()) {
                    yield result("There are no backend playlists for the current user yet.");
                }
                String names = playlists.stream()
                        .limit(6)
                        .map(playlist -> playlist.name() + " (" + playlist.tracks().size() + ")")
                        .reduce((left, right) -> left + ", " + right)
                        .orElse("");
                yield result("I found " + playlists.size() + " backend playlist(s): " + names + ".");
            }
            case CREATE_PLAYLIST -> {
                String name = command.query().isBlank() ? "New Playlist" : command.query();
                LibraryMutationResponse mutation = libraryService.createPlaylist(name, "Created by Quaver Agent.");
                yield result("Created playlist \"" + name + "\".", mutation);
            }
            case RENAME_PLAYLIST -> {
                PlaylistView playlist = findPlaylist(command.argument("playlist"), request);
                String nextName = command.argument("name");
                if (playlist == null) {
                    yield result("I parsed this as a playlist rename request, but I could not find the source playlist.");
                }
                if (nextName.isBlank()) {
                    yield result("I parsed this as a playlist rename request, but the new name is missing.");
                }
                LibraryMutationResponse mutation = libraryService.updatePlaylist(playlist.id(), nextName, playlist.description());
                yield result("Renamed playlist \"" + playlist.name() + "\" to \"" + nextName + "\".", mutation);
            }
            case DELETE_PLAYLIST -> {
                PlaylistView playlist = findPlaylist(command.query(), request);
                if (playlist == null) {
                    yield result("I parsed this as a playlist delete request, but I could not find that playlist.");
                }
                LibraryMutationResponse mutation = libraryService.deletePlaylist(playlist.id());
                yield result("Deleted playlist \"" + playlist.name() + "\".", mutation);
            }
            case ADD_TRACK_TO_PLAYLIST -> {
                PlaylistView playlist = findPlaylist(command.argument("playlist"), request);
                String trackQuery = command.argument("track").isBlank() ? command.query() : command.argument("track");
                if (playlist == null) {
                    yield result("I parsed this as an add-to-playlist request, but I could not find the target playlist.");
                }
                AgentTrackSearchResponse response = searchTracks(trackQuery, request, 1);
                if (response.getTracks().isEmpty()) {
                    yield result("I parsed this as an add-to-playlist request, but I could not find a matching track.");
                }
                TrackView track = response.getTracks().getFirst();
                LibraryMutationResponse mutation = libraryService.addTrackToPlaylist(playlist.id(), track.id());
                yield result("Saved \"" + track.title() + "\" to playlist \"" + playlist.name() + "\".", mutation,
                        trackCards("Saved track", List.of(track)));
            }
            case ADD_TRACK_TO_QUEUE -> {
                AgentTrackSearchResponse response = searchTracks(command.query().isBlank() ? request.getContent() : command.query(), request, 1);
                if (response.getTracks().isEmpty()) {
                    yield result("I parsed this as a queue request, but I could not find a matching track.");
                }
                TrackView track = response.getTracks().getFirst();
                LibraryMutationResponse mutation = libraryService.appendTrackToQueue(track.id());
                yield result("Added \"" + track.title() + "\" to the queue.", mutation,
                        queueMetadata("queue_append", track));
            }
            case INSERT_TRACK_NEXT -> {
                AgentTrackSearchResponse response = searchTracks(command.query().isBlank() ? request.getContent() : command.query(), request, 1);
                if (response.getTracks().isEmpty()) {
                    yield result("I parsed this as a play-next request, but I could not find a matching track.");
                }
                TrackView track = response.getTracks().getFirst();
                LibraryMutationResponse mutation = libraryService.insertTrackNext(track.id());
                yield result("Inserted \"" + track.title() + "\" as the next track.", mutation,
                        queueMetadata("queue_insert_next", track));
            }
            case CHAT -> result("Agent request accepted for music chat. No library or playback mutation was executed; return a natural Quaver Agent response focused on music.");
        };
    }

    private List<AgentOperationDto> buildOperations(ParsedAgentCommand command) {
        AgentOperationDto parsed = operation("decision", "Intent parsed", "Detected intent: " + command.intent().name(), "completed");
        return switch (command.intent()) {
            case SEARCH -> List.of(parsed, operation("tool_call", "Track search", "Search sent to cache and Spotify bridge.", "completed"));
            case PLAY -> List.of(parsed, operation("tool_call", "Track search", "Searching tracks for playback.", "completed"),
                    operation("tool_call", "Queue sync", "Playback queue has been updated on the backend.", "completed"));
            case PLAY_PLAYLIST -> List.of(parsed, operation("tool_call", "Playlist lookup", "Resolved playlist tracks.", "completed"),
                    operation("tool_call", "Queue sync", "Playback queue has been updated on the backend.", "completed"));
            case PAUSE, NEXT, PREVIOUS -> List.of(parsed, operation("tool_call", "Playback sync", "Playback state has been updated on the backend.", "completed"));
            case LIST_PLAYLISTS -> List.of(parsed, operation("tool_call", "Playlist lookup", "Backend playlists were read.", "completed"));
            case CREATE_PLAYLIST, RENAME_PLAYLIST, DELETE_PLAYLIST -> List.of(parsed, operation("tool_call", "Playlist mutation", "Backend playlists were updated.", "completed"));
            case ADD_TRACK_TO_PLAYLIST -> List.of(parsed, operation("tool_call", "Track search", "Resolved the requested track.", "completed"),
                    operation("tool_call", "Playlist mutation", "Target playlist was updated.", "completed"));
            case ADD_TRACK_TO_QUEUE, INSERT_TRACK_NEXT -> List.of(parsed, operation("tool_call", "Track search", "Resolved the requested track.", "completed"),
                    operation("tool_call", "Queue sync", "Playback queue has been updated on the backend.", "completed"));
            case CHAT -> List.of(
                    parsed,
                    operation("agent_request", "Agent request", "Music chat request sent to DeepSeek deepseek-v4-pro.", "completed"),
                    operation("agent_response", "Agent response", "Music-focused assistant response streamed back to the UI.", "completed")
            );
        };
    }

    private AgentTrackSearchResponse searchTracks(String query, SendAgentMessageRequest request, int limit) {
        return agentTrackSearchService.search(new AgentTrackSearchRequest(
                query,
                aiProperties.getSearchModel(),
                limit,
                0,
                selectedPlaylistId(request),
                List.of(),
                List.of(),
                request.getSpotifyDeveloperAccount(),
                request.getMetadata()
        ));
    }

    private AgentActionResult movePlaybackBy(int offset, String direction) {
        PlaybackStateView current = libraryService.getPlaybackState();
        if (current == null || current.queue().isEmpty()) {
            return result("I parsed this as a " + direction + "-track request, but there is no active queue yet.");
        }

        int targetIndex = Math.max(0, Math.min(current.queue().size() - 1, current.currentTrackIndex() + offset));
        PlaybackStateView playback = libraryService.updatePlaybackState(targetIndex, true, 0, null, null, null, null);
        TrackView activeTrack = playback.queue().get(playback.currentTrackIndex());
        return result(
                "Moved to " + direction + " track: \"" + activeTrack.title() + "\" by " + activeTrack.artist() + ".",
                playbackMutation("Playback moved to " + direction + " track.", playback),
                playbackMetadata("seek_to_index", playback, List.of(activeTrack))
        );
    }

    private int playbackSearchLimit(ParsedAgentCommand command) {
        return SELECTION_SINGLE.equalsIgnoreCase(command.argument("selectionMode")) ? 1 : 8;
    }

    private PlaylistView findPlaylist(String query, SendAgentMessageRequest request) {
        String selectedPlaylistId = selectedPlaylistId(request);
        String normalizedQuery = normalizeLookup(query);
        List<PlaylistView> playlists = libraryService.listPlaylists();

        if (normalizedQuery.isBlank() && !selectedPlaylistId.isBlank()) {
            normalizedQuery = normalizeLookup(selectedPlaylistId);
        }
        if (normalizedQuery.isBlank()) {
            return null;
        }

        for (PlaylistView playlist : playlists) {
            if (Objects.equals(normalizeLookup(playlist.id()), normalizedQuery)
                    || Objects.equals(normalizeLookup(playlist.name()), normalizedQuery)) {
                return playlist;
            }
        }
        for (PlaylistView playlist : playlists) {
            if (normalizeLookup(playlist.name()).contains(normalizedQuery)
                    || normalizedQuery.contains(normalizeLookup(playlist.name()))) {
                return playlist;
            }
        }
        return null;
    }

    private String selectedPlaylistId(SendAgentMessageRequest request) {
        if (request == null || request.getMetadata() == null) {
            return "";
        }
        Object value = request.getMetadata().get("selectedPlaylistId");
        return value instanceof String selectedPlaylistId ? selectedPlaylistId.trim() : "";
    }

    private String normalizeLookup(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private LibraryMutationResponse playbackMutation(String message, PlaybackStateView playback) {
        return new LibraryMutationResponse(true, message, playback, null, null);
    }

    private AgentActionResult result(String reply) {
        return new AgentActionResult(reply, null, Map.of());
    }

    private AgentActionResult result(String reply, LibraryMutationResponse mutation) {
        return new AgentActionResult(reply, mutation, Map.of());
    }

    private AgentActionResult result(String reply, LibraryMutationResponse mutation, Map<String, Object> metadata) {
        return new AgentActionResult(reply, mutation, metadata == null ? Map.of() : metadata);
    }

    private Map<String, Object> assistantMetadata(ParsedAgentCommand command, AgentActionResult actionResult) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("intent", command.intent().name());
        metadata.put("persistence", "transient");
        metadata.put("selectionMode", command.argument("selectionMode"));
        metadata.putAll(actionResult.metadata());
        return metadata;
    }

    private Map<String, Object> trackCards(String title, List<TrackView> tracks) {
        return Map.of(
                "cards", Map.of(
                        "type", "track_list",
                        "title", title,
                        "tracks", tracks == null ? List.of() : tracks
                )
        );
    }

    private Map<String, Object> playbackMetadata(String command, PlaybackStateView playback, List<TrackView> tracks) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("playbackCommand", command);
        metadata.putAll(trackCards("Playback queue", tracks == null || tracks.isEmpty() ? playback.queue() : tracks));
        return metadata;
    }

    private Map<String, Object> queueMetadata(String command, TrackView track) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("playbackCommand", command);
        metadata.putAll(trackCards("Queued track", List.of(track)));
        return metadata;
    }

    private AgentConversationDto createConversationDto(String title, String model) {
        String now = LocalDateTime.now(clock).toString();
        return new AgentConversationDto(
                TRANSIENT_CONVERSATION_ID,
                title == null || title.isBlank() ? "Agent Session" : title,
                resolveAgentModel(model, null),
                "idle",
                now,
                now
        );
    }

    private AgentOperationDto operation(String type, String title, String detail, String status) {
        return new AgentOperationDto(UUID.randomUUID().toString(), type, title, detail, status, LocalDateTime.now(clock).toString());
    }

    private String resolveConversationId(String conversationId) {
        return conversationId == null || conversationId.isBlank()
                ? TRANSIENT_CONVERSATION_ID
                : conversationId;
    }

    private String resolveAgentModel(String requestedModel, String conversationModel) {
        if (requestedModel != null && !requestedModel.isBlank()) {
            return requestedModel;
        }
        if (conversationModel != null && !conversationModel.isBlank()) {
            return conversationModel;
        }
        return aiProperties.getAgentModel();
    }

    private boolean isSpotifyBridgeAuthorized() {
        try {
            return spotifyAuthService.getValidAccessToken().isPresent();
        } catch (Exception ignored) {
            return false;
        }
    }

    private void emit(SseEmitter emitter, String eventName, AgentStreamEventDto event) throws IOException {
        emitter.send(SseEmitter.event().name(eventName).data(event));
    }

    private void emitUnchecked(SseEmitter emitter, String eventName, AgentStreamEventDto event) {
        try {
            emit(emitter, eventName, event);
        } catch (IOException exception) {
            throw new AgentStreamSendException(exception);
        }
    }

    private void emitError(SseEmitter emitter, Exception exception) {
        try {
            emit(emitter, "error", AgentStreamEventDto.builder()
                    .type("error")
                    .error(resolveMessage(exception))
                    .build());
        } catch (IOException ignored) {
            // Client disconnected; nothing useful remains to send.
        }
    }

    private String resolveMessage(Exception exception) {
        if (exception.getMessage() == null || exception.getMessage().isBlank()) {
            return "Agent request failed.";
        }
        return exception.getMessage();
    }

    private record AgentActionResult(String reply, LibraryMutationResponse libraryMutation, Map<String, Object> metadata) {
    }

    private static class AgentStreamSendException extends RuntimeException {
        AgentStreamSendException(Throwable cause) {
            super(cause);
        }
    }
}
