package com.quaver.agent.model;

import java.util.Map;

public record ParsedAgentCommand(
        AgentIntent intent,
        String query,
        Map<String, String> arguments
) {
    public ParsedAgentCommand(AgentIntent intent, String query) {
        this(intent, query, Map.of());
    }

    public ParsedAgentCommand {
        query = query == null ? "" : query;
        arguments = arguments == null ? Map.of() : Map.copyOf(arguments);
    }

    public String argument(String key) {
        return arguments.getOrDefault(key, "");
    }
}
