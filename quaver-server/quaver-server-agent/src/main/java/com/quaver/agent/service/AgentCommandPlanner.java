package com.quaver.agent.service;

import com.quaver.agent.ai.AgentAiService;
import com.quaver.agent.dto.SendAgentMessageRequest;
import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import org.springframework.stereotype.Component;

@Component
public class AgentCommandPlanner {

    private final AgentAiService agentAiService;
    private final AgentCommandParser fallbackParser;

    public AgentCommandPlanner(AgentAiService agentAiService, AgentCommandParser fallbackParser) {
        this.agentAiService = agentAiService;
        this.fallbackParser = fallbackParser;
    }

    public ParsedAgentCommand plan(SendAgentMessageRequest request) {
        String content = request == null ? "" : request.getContent();
        ParsedAgentCommand deterministicCommand = fallbackParser.parse(content);
        if (isHighConfidenceCommand(deterministicCommand)) {
            return deterministicCommand;
        }

        return agentAiService.parseCommand(content, request == null ? null : request.getMetadata())
                .orElse(deterministicCommand);
    }

    private boolean isHighConfidenceCommand(ParsedAgentCommand command) {
        AgentIntent intent = command.intent();
        return switch (intent) {
            case CREATE_PLAYLIST,
                 RENAME_PLAYLIST,
                 DELETE_PLAYLIST,
                 ADD_TRACK_TO_PLAYLIST,
                 ADD_TRACK_TO_QUEUE,
                 REMOVE_TRACK_FROM_QUEUE,
                 CLEAR_QUEUE,
                 INSERT_TRACK_NEXT,
                 PLAY_PLAYLIST,
                 PAUSE,
                 NEXT,
                 PREVIOUS -> true;
            case SEARCH, PLAY, LIST_PLAYLISTS, CHAT -> false;
        };
    }
}
