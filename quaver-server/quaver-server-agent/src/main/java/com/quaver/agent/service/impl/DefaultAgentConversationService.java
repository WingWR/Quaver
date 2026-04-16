package com.quaver.agent.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.quaver.agent.dto.AgentConversationDto;
import com.quaver.agent.dto.AgentConversationPayload;
import com.quaver.agent.dto.AgentMessageDto;
import com.quaver.agent.dto.AgentOperationDto;
import com.quaver.agent.dto.AgentRuntimeStatusDto;
import com.quaver.agent.dto.CreateAgentConversationRequest;
import com.quaver.agent.dto.SendAgentMessageRequest;
import com.quaver.agent.dto.SendAgentMessageResponse;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;
import com.quaver.agent.entity.AgentConversationEntity;
import com.quaver.agent.entity.AgentMessageEntity;
import com.quaver.agent.mapper.AgentConversationMapper;
import com.quaver.agent.mapper.AgentMessageMapper;
import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import com.quaver.agent.service.AgentCommandParser;
import com.quaver.agent.service.AgentConversationService;
import com.quaver.agent.service.AgentTrackSearchService;
import com.quaver.common.config.QuaverAiProperties;
import com.quaver.common.exception.NotFoundException;
import com.quaver.common.identity.UserContextService;
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
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultAgentConversationService implements AgentConversationService {

    private final UserContextService userContextService;
    private final AgentConversationMapper conversationMapper;
    private final AgentMessageMapper messageMapper;
    private final AgentCommandParser agentCommandParser;
    private final AgentTrackSearchService agentTrackSearchService;
    private final LibraryService libraryService;
    private final QuaverAiProperties aiProperties;
    private final SpotifyProperties spotifyProperties;
    private final SpotifyAuthService spotifyAuthService;
    private final Clock clock;

    public DefaultAgentConversationService(
            UserContextService userContextService,
            AgentConversationMapper conversationMapper,
            AgentMessageMapper messageMapper,
            AgentCommandParser agentCommandParser,
            AgentTrackSearchService agentTrackSearchService,
            LibraryService libraryService,
            QuaverAiProperties aiProperties,
            SpotifyProperties spotifyProperties,
            SpotifyAuthService spotifyAuthService,
            Clock clock
    ) {
        this.userContextService = userContextService;
        this.conversationMapper = conversationMapper;
        this.messageMapper = messageMapper;
        this.agentCommandParser = agentCommandParser;
        this.agentTrackSearchService = agentTrackSearchService;
        this.libraryService = libraryService;
        this.aiProperties = aiProperties;
        this.spotifyProperties = spotifyProperties;
        this.spotifyAuthService = spotifyAuthService;
        this.clock = clock;
    }

    @Override
    public AgentConversationPayload getDefaultConversation() {
        String userId = userContextService.getCurrentUserId();
        AgentConversationEntity entity = conversationMapper.selectOne(Wrappers.lambdaQuery(AgentConversationEntity.class)
                .eq(AgentConversationEntity::getUserId, userId)
                .eq(AgentConversationEntity::getIsDefaultConversation, true)
                .last("limit 1"));
        if (entity == null) {
            throw new NotFoundException("Default conversation does not exist yet.");
        }
        return new AgentConversationPayload(toConversationDto(entity), listMessages(entity.getId()));
    }

    @Override
    @Transactional
    public AgentConversationPayload createConversation(CreateAgentConversationRequest request) {
        String userId = userContextService.getCurrentUserId();
        boolean hasConversation = conversationMapper.selectCount(Wrappers.lambdaQuery(AgentConversationEntity.class)
                .eq(AgentConversationEntity::getUserId, userId)) > 0;

        AgentConversationEntity entity = new AgentConversationEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setUserId(userId);
        entity.setTitle(request.getTitle() == null || request.getTitle().isBlank() ? "Quaver Agent Session" : request.getTitle());
        entity.setModel(request.getModel() == null || request.getModel().isBlank() ? aiProperties.getModel() : request.getModel());
        entity.setStatus("idle");
        entity.setIsDefaultConversation(!hasConversation);
        entity.setMetadata(request.getMetadata());
        entity.setCreatedAt(LocalDateTime.now(clock));
        entity.setUpdatedAt(LocalDateTime.now(clock));
        conversationMapper.insert(entity);
        return new AgentConversationPayload(toConversationDto(entity), List.of());
    }

    @Override
    @Transactional
    public SendAgentMessageResponse sendMessage(String conversationId, SendAgentMessageRequest request) {
        AgentConversationEntity conversation = conversationMapper.selectById(conversationId);
        if (conversation == null) {
            throw new NotFoundException("Conversation does not exist.");
        }

        AgentMessageEntity userMessage = saveMessage(conversation, "user", request.getContent(), request.getModel(),
                List.of(operation("status", "Message received", "User message stored for parsing.", "completed")), request.getMetadata());

        ParsedAgentCommand command = agentCommandParser.parse(request.getContent());
        AgentMessageEntity assistantMessage = saveMessage(
                conversation,
                "assistant",
                buildAssistantReply(command, request),
                request.getModel() == null || request.getModel().isBlank() ? conversation.getModel() : request.getModel(),
                buildOperations(command, request),
                Map.of("intent", command.intent().name())
        );

        conversation.setStatus("idle");
        conversation.setUpdatedAt(LocalDateTime.now(clock));
        conversationMapper.updateById(conversation);
        return new SendAgentMessageResponse(
                toConversationDto(conversation),
                toMessageDto(userMessage),
                toMessageDto(assistantMessage),
                listMessages(conversationId)
        );
    }

    @Override
    public AgentRuntimeStatusDto getRuntimeStatus() {
        return new AgentRuntimeStatusDto(
                aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank(),
                aiProperties.getModel(),
                spotifyProperties.isEnabled(),
                spotifyAuthService.getValidAccessToken().isPresent()
        );
    }

    private String buildAssistantReply(ParsedAgentCommand command, SendAgentMessageRequest request) {
        return switch (command.intent()) {
            case SEARCH -> {
                AgentTrackSearchResponse response = agentTrackSearchService.search(new AgentTrackSearchRequest(
                        command.query(),
                        request.getModel(),
                        5,
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
                yield "I parsed this as a search request and found " + response.getTotal() + " candidate tracks. Top results: " + topTitles + ".";
            }
            case PLAY -> {
                AgentTrackSearchResponse response = agentTrackSearchService.search(new AgentTrackSearchRequest(
                        command.query().isBlank() ? request.getContent() : command.query(),
                        request.getModel(),
                        8,
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
            case PAUSE -> "Pause command received. The command parser and conversation pipeline are active; detailed playback orchestration can be expanded next.";
            case NEXT -> "Next-track command received. The current implementation records the intent and keeps the command path ready for later playback orchestration.";
            case PREVIOUS -> "Previous-track command received. The current implementation records the intent and keeps the command path ready for later playback orchestration.";
            case CHAT -> "Conversation pipeline is available. This stage stores messages, parses simple music intents, and leaves deeper planning and LLM execution for the next iteration.";
        };
    }

    private List<AgentOperationDto> buildOperations(ParsedAgentCommand command, SendAgentMessageRequest request) {
        AgentOperationDto parsed = operation("decision", "Intent parsed", "Detected intent: " + command.intent().name(), "completed");
        return switch (command.intent()) {
            case SEARCH -> List.of(parsed, operation("tool_call", "Track search", "Search sent to cache and Spotify bridge.", "completed"));
            case PLAY -> List.of(parsed, operation("tool_call", "Track search", "Searching tracks for playback.", "completed"),
                    operation("tool_call", "Queue sync", "Playback queue has been updated on the backend.", "completed"));
            case PAUSE, NEXT, PREVIOUS -> List.of(parsed, operation("status", "Command accepted", "Execution hook reserved for the next algorithm iteration.", "completed"));
            case CHAT -> List.of(parsed, operation("status", "Conversation persisted", "Message history saved to MySQL.", "completed"));
        };
    }

    private AgentMessageEntity saveMessage(
            AgentConversationEntity conversation,
            String role,
            String content,
            String model,
            List<AgentOperationDto> operations,
            Map<String, Object> metadata
    ) {
        AgentMessageEntity message = new AgentMessageEntity();
        message.setId(UUID.randomUUID().toString());
        message.setConversationId(conversation.getId());
        message.setUserId(conversation.getUserId());
        message.setRole(role);
        message.setContent(content);
        message.setStatus("completed");
        message.setModel(model == null || model.isBlank() ? conversation.getModel() : model);
        message.setOperations(operations);
        message.setMetadata(metadata);
        message.setCreatedAt(LocalDateTime.now(clock));
        messageMapper.insert(message);
        return message;
    }

    private List<AgentMessageDto> listMessages(String conversationId) {
        return messageMapper.selectList(Wrappers.lambdaQuery(AgentMessageEntity.class)
                        .eq(AgentMessageEntity::getConversationId, conversationId)
                        .orderByAsc(AgentMessageEntity::getCreatedAt))
                .stream()
                .map(this::toMessageDto)
                .toList();
    }

    private AgentConversationDto toConversationDto(AgentConversationEntity entity) {
        return new AgentConversationDto(
                entity.getId(),
                entity.getTitle(),
                entity.getModel(),
                entity.getStatus(),
                entity.getCreatedAt() == null ? null : entity.getCreatedAt().toString(),
                entity.getUpdatedAt() == null ? null : entity.getUpdatedAt().toString()
        );
    }

    private AgentMessageDto toMessageDto(AgentMessageEntity entity) {
        return new AgentMessageDto(
                entity.getId(),
                entity.getConversationId(),
                entity.getRole(),
                entity.getContent(),
                entity.getCreatedAt() == null ? null : entity.getCreatedAt().toString(),
                entity.getStatus(),
                entity.getModel(),
                entity.getOperations(),
                entity.getMetadata()
        );
    }

    private AgentOperationDto operation(String type, String title, String detail, String status) {
        return new AgentOperationDto(UUID.randomUUID().toString(), type, title, detail, status, LocalDateTime.now(clock).toString());
    }
}
