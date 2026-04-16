package com.quaver.agent.service;

import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import org.springframework.stereotype.Component;

@Component
public class AgentCommandParser {

    public ParsedAgentCommand parse(String content) {
        String normalized = content == null ? "" : content.trim();
        String lowered = normalized.toLowerCase();

        if (containsAny(lowered, "pause", "暂停", "停一下")) {
            return new ParsedAgentCommand(AgentIntent.PAUSE, normalized);
        }
        if (containsAny(lowered, "next", "下一首", "切歌")) {
            return new ParsedAgentCommand(AgentIntent.NEXT, normalized);
        }
        if (containsAny(lowered, "previous", "上一首")) {
            return new ParsedAgentCommand(AgentIntent.PREVIOUS, normalized);
        }
        if (containsAny(lowered, "play", "播放", "来点", "播点")) {
            return new ParsedAgentCommand(AgentIntent.PLAY, extractQuery(normalized));
        }
        if (containsAny(lowered, "search", "搜索", "找", "想听")) {
            return new ParsedAgentCommand(AgentIntent.SEARCH, extractQuery(normalized));
        }
        return new ParsedAgentCommand(AgentIntent.CHAT, normalized);
    }

    private String extractQuery(String content) {
        String normalized = content == null ? "" : content.trim();
        return normalized
                .replace("播放", "")
                .replace("来点", "")
                .replace("播点", "")
                .replace("search", "")
                .replace("Search", "")
                .replace("搜索", "")
                .replace("找", "")
                .trim();
    }

    private boolean containsAny(String content, String... values) {
        for (String value : values) {
            if (content.contains(value)) {
                return true;
            }
        }
        return false;
    }
}
