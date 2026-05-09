package com.quaver.agent.service;

import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class AgentCommandParserTest {

    private final AgentCommandParser parser = new AgentCommandParser();

    @Test
    void shouldDetectPlayIntent() {
        Assertions.assertEquals(AgentIntent.PLAY, parser.parse("给我播放周杰伦").intent());
    }

    @Test
    void shouldTreatWantToListenAsPlayback() {
        ParsedAgentCommand command = parser.parse("我想听周杰伦的歌");

        Assertions.assertEquals(AgentIntent.PLAY, command.intent());
        Assertions.assertEquals("collection", command.argument("selectionMode"));
    }

    @Test
    void shouldDetectSearchIntent() {
        Assertions.assertEquals(AgentIntent.SEARCH, parser.parse("搜索 chill 歌单").intent());
    }

    @Test
    void shouldDetectPlaylistCreation() {
        ParsedAgentCommand command = parser.parse("创建歌单 夜跑");

        Assertions.assertEquals(AgentIntent.CREATE_PLAYLIST, command.intent());
        Assertions.assertEquals("夜跑", command.query());
    }

    @Test
    void shouldDetectPlaylistRename() {
        ParsedAgentCommand command = parser.parse("把歌单 夜跑 改名为 深夜跑步");

        Assertions.assertEquals(AgentIntent.RENAME_PLAYLIST, command.intent());
        Assertions.assertEquals("夜跑", command.argument("playlist"));
        Assertions.assertEquals("深夜跑步", command.argument("name"));
    }

    @Test
    void shouldDetectAddTrackToPlaylist() {
        ParsedAgentCommand command = parser.parse("把七里香加入歌单 夜跑");

        Assertions.assertEquals(AgentIntent.ADD_TRACK_TO_PLAYLIST, command.intent());
        Assertions.assertEquals("七里香", command.argument("track"));
        Assertions.assertEquals("夜跑", command.argument("playlist"));
        Assertions.assertEquals("single", command.argument("selectionMode"));
    }

    @Test
    void shouldTreatPlaybackListAsQueue() {
        ParsedAgentCommand command = parser.parse("把七里香加入播放列表");

        Assertions.assertEquals(AgentIntent.ADD_TRACK_TO_QUEUE, command.intent());
        Assertions.assertEquals("七里香", command.query());
        Assertions.assertEquals("single", command.argument("selectionMode"));
    }

    @Test
    void shouldFallbackToChatIntent() {
        Assertions.assertEquals(AgentIntent.CHAT, parser.parse("今天心情一般").intent());
    }
}
