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
    void shouldDetectNaturalPlaylistCreation() {
        ParsedAgentCommand command = parser.parse("帮我创建一个叫夜跑的歌单");

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
    void shouldAddSingleTrackToPlaybackQueue() {
        ParsedAgentCommand command = parser.parse("添加夜曲到播放队列");

        Assertions.assertEquals(AgentIntent.ADD_TRACK_TO_QUEUE, command.intent());
        Assertions.assertEquals("夜曲", command.query());
        Assertions.assertEquals("single", command.argument("selectionMode"));
    }

    @Test
    void shouldRemoveTrackFromPlaybackQueue() {
        ParsedAgentCommand command = parser.parse("从播放队列移除夜曲");

        Assertions.assertEquals(AgentIntent.REMOVE_TRACK_FROM_QUEUE, command.intent());
        Assertions.assertEquals("夜曲", command.query());
    }

    @Test
    void shouldClearPlaybackQueue() {
        ParsedAgentCommand command = parser.parse("清空播放队列");

        Assertions.assertEquals(AgentIntent.CLEAR_QUEUE, command.intent());
        Assertions.assertEquals("", command.query());
    }

    @Test
    void shouldMoveQueuedTrackToNextUp() {
        ParsedAgentCommand command = parser.parse("把夜曲移到最前");

        Assertions.assertEquals(AgentIntent.INSERT_TRACK_NEXT, command.intent());
        Assertions.assertEquals("夜曲", command.query());
    }

    @Test
    void shouldFallbackToChatIntent() {
        Assertions.assertEquals(AgentIntent.CHAT, parser.parse("今天心情一般").intent());
    }
}
