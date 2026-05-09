package com.quaver.agent.service;

import com.quaver.agent.ai.AgentAiService;
import com.quaver.agent.dto.SendAgentMessageRequest;
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
        return agentAiService.parseCommand(content, request == null ? null : request.getMetadata())
                .orElseGet(() -> fallbackParser.parse(content));
    }
}
