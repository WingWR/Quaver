package com.quaver.agent.controller;

import com.quaver.agent.dto.AgentConversationPayload;
import com.quaver.agent.dto.AgentRuntimeStatusDto;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.dto.AgentTrackSearchResponse;
import com.quaver.agent.dto.CreateAgentConversationRequest;
import com.quaver.agent.dto.SendAgentMessageRequest;
import com.quaver.agent.dto.SendAgentMessageResponse;
import com.quaver.agent.service.AgentConversationService;
import com.quaver.agent.service.AgentTrackSearchService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/agent")
public class AgentController {

    private final AgentConversationService agentConversationService;
    private final AgentTrackSearchService agentTrackSearchService;

    public AgentController(AgentConversationService agentConversationService,
                           AgentTrackSearchService agentTrackSearchService) {
        this.agentConversationService = agentConversationService;
        this.agentTrackSearchService = agentTrackSearchService;
    }

    @GetMapping("/conversations/default")
    public AgentConversationPayload getDefaultConversation() {
        return agentConversationService.getDefaultConversation();
    }

    @PostMapping("/conversations")
    public AgentConversationPayload createConversation(@RequestBody(required = false) CreateAgentConversationRequest request) {
        return agentConversationService.createConversation(request == null
                ? new CreateAgentConversationRequest(null, null, null, null)
                : request);
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public SendAgentMessageResponse sendMessage(@PathVariable String conversationId,
                                                @RequestBody SendAgentMessageRequest request) {
        return agentConversationService.sendMessage(conversationId, request);
    }

    @PostMapping(value = "/conversations/{conversationId}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessage(@PathVariable String conversationId,
                                    @RequestBody SendAgentMessageRequest request) {
        return agentConversationService.streamMessage(conversationId, request);
    }

    @PostMapping("/search/tracks")
    public AgentTrackSearchResponse searchTracks(@RequestBody AgentTrackSearchRequest request) {
        return agentTrackSearchService.search(request);
    }

    @GetMapping("/runtime-status")
    public AgentRuntimeStatusDto runtimeStatus() {
        return agentConversationService.getRuntimeStatus();
    }
}
