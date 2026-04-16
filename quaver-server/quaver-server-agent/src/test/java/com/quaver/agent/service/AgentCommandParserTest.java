package com.quaver.agent.service;

import com.quaver.agent.model.AgentIntent;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class AgentCommandParserTest {

    private final AgentCommandParser parser = new AgentCommandParser();

    @Test
    void shouldDetectPlayIntent() {
        Assertions.assertEquals(AgentIntent.PLAY, parser.parse("给我播放周杰伦").intent());
    }

    @Test
    void shouldDetectSearchIntent() {
        Assertions.assertEquals(AgentIntent.SEARCH, parser.parse("搜索 chill 歌单").intent());
    }

    @Test
    void shouldFallbackToChatIntent() {
        Assertions.assertEquals(AgentIntent.CHAT, parser.parse("今天心情一般").intent());
    }
}
