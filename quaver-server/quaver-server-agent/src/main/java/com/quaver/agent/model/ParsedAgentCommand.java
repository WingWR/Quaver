package com.quaver.agent.model;

public record ParsedAgentCommand(
        AgentIntent intent,
        String query
) {
}
