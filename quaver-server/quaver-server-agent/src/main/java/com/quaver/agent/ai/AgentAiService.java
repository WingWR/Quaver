package com.quaver.agent.ai;

import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.model.ParsedAgentCommand;

public interface AgentAiService {

    boolean isConfigured();

    String normalizeSearchQuery(AgentTrackSearchRequest request);

    String composeAgentReply(String userMessage, ParsedAgentCommand command, String deterministicReply, String model);
}
