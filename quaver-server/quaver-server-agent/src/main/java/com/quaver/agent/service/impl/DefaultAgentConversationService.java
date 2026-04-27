package com.quaver.agent.service.impl;

import com.quaver.agent.ai.AgentAiService;
import com.quaver.agent.dto.AgentConversationDto;
import com.quaver.agent.dto.AgentConversationPayload;
import com.quaver.agent.dto.AgentMessageDto;
import com.quaver.agent.dto.AgentOperationDto;
import com.quaver.agent.dto.AgentRuntimeStatusDto;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;
import com.quaver.agent.dto.CreateAgentConversationRequest;
import com.quaver.agent.dto.SendAgentMessageRequest;
import com.quaver.agent.dto.SendAgentMessageResponse;
import com.quaver.agent.model.ParsedAgentCommand;
import com.quaver.agent.service.AgentCommandParser;
import com.quaver.agent.service.AgentConversationService;
import com.quaver.agent.service.AgentTrackSearchService;
import com.quaver.common.config.QuaverAiProperties;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.TrackView;
import com.quaver.library.service.LibraryService;
import com.quaver.spotify.config.SpotifyProperties;
import com.quaver.spotify.service.SpotifyAuthService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DefaultAgentConversationService implements AgentConversationService {

    private static final String TRANSIENT_CONVERSATION_ID = "transient-agent-session";

    private final AgentCommandParser agentCommandParser;
    private final AgentTrackSearchService agentTrackSearchService;
    private final AgentAiService agentAiService;
    private final LibraryService libraryService;
    private final QuaverAiProperties aiProperties;
    private final SpotifyProperties spotifyProperties;
    private final SpotifyAuthService spotifyAuthService;
    private final Clock clock;

    public DefaultAgentConversationService(
            AgentCommandParser agentCommandParser,
            AgentTrackSearchService agentTrackSearchService,
            AgentAiService agentAiService,
            LibraryService libraryService,
            QuaverAiProperties aiProperties,
            SpotifyProperties spotifyProperties,
            SpotifyAuthService spotifyAuthService,
            Clock clock
    ) {
        this.agentCommandParser = agentCommandParser;
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
        ParsedAgentCommand command = agentCommandParser.parse(request.getContent());
        String deterministicReply = buildAssistantReply(command, request);
        String assistantReply = agentAiService.composeAgentReply(
                request.getContent(),
                command,
                deterministicReply,
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
                Map.of("intent", command.intent().name(), "persistence", "transient")
        );

        return new SendAgentMessageResponse(conversation, userMessage, assistantMessage, null);
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

    private String buildAssistantReply(ParsedAgentCommand command, SendAgentMessageRequest request) {
        return switch (command.intent()) {
            case SEARCH -> {
                AgentTrackSearchResponse response = agentTrackSearchService.search(new AgentTrackSearchRequest(
                        command.query(),
                        aiProperties.getSearchModel(),
                        12,
                        0,
                        null,
                        List.of(),
                        List.of(),
                        request.getSpotifyDeveloperAccount(),
                        request.getMetadata()
                ));
                if (response.getTracks().isEmpty()) {
                    yield "I parsed this as a search request, but there are no matching tracks in the current cache or Spotify bridge.";
                }
                String topTitles = response.getTracks().stream().limit(3).map(TrackView::title).reduce((left, right) -> left + ", " + right).orElse("");
                yield "I parsed this as a search request and found " + response.getTracks().size() + " visible candidate tracks. Top results: " + topTitles + ".";
            }
            case PLAY -> {
                AgentTrackSearchResponse response = agentTrackSearchService.search(new AgentTrackSearchRequest(
                        command.query().isBlank() ? request.getContent() : command.query(),
                        aiProperties.getSearchModel(),
                        12,
                        0,
                        null,
                        List.of(),
                        List.of(),
                        request.getSpotifyDeveloperAccount(),
                        request.getMetadata()
                ));
                if (response.getTracks().isEmpty()) {
                    yield "I parsed this as a play command, but I could not find a playable track yet.";
                }
                libraryService.startPlayback(response.getTracks(), 0,
                        response.getTracks().getFirst().source() == PlaybackSource.SPOTIFY ? PlaybackSource.SPOTIFY : PlaybackSource.BACKEND);
                yield "I parsed this as a play command and loaded " + response.getTracks().size()
                        + " track(s) into the queue. Playback session state has been updated on the backend.";
            }
            case PAUSE -> "Pause command received. This transient agent mode does not save message history.";
            case NEXT -> "Next-track command received. This transient agent mode does not save message history.";
            case PREVIOUS -> "Previous-track command received. This transient agent mode does not save message history.";
            case CHAT -> "Conversation pipeline is available in transient mode. Messages are not saved to MySQL.";
        };
    }

    private List<AgentOperationDto> buildOperations(ParsedAgentCommand command) {
        AgentOperationDto parsed = operation("decision", "Intent parsed", "Detected intent: " + command.intent().name(), "completed");
        return switch (command.intent()) {
            case SEARCH -> List.of(parsed, operation("tool_call", "Track search", "Search sent to cache and Spotify bridge.", "completed"));
            case PLAY -> List.of(parsed, operation("tool_call", "Track search", "Searching tracks for playback.", "completed"),
                    operation("tool_call", "Queue sync", "Playback queue has been updated on the backend.", "completed"));
            case PAUSE, NEXT, PREVIOUS -> List.of(parsed, operation("status", "Command accepted", "No conversation history saved.", "completed"));
            case CHAT -> List.of(parsed, operation("status", "Transient response", "No conversation history saved.", "completed"));
        };
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
}
