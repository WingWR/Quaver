package com.quaver.agent.service;

import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class AgentCommandParser {

    private static final Pattern RENAME_PLAYLIST_EN = Pattern.compile(
            "(?i)rename\\s+(?:playlist\\s+)?(.+?)\\s+to\\s+(.+)");
    private static final Pattern RENAME_PLAYLIST_ZH = Pattern.compile(
            "(?:把|将)?\\s*(?:歌单|列表)?\\s*(.+?)\\s*(?:重命名为|改名为|改成|改为)\\s*(.+)");
    private static final Pattern ADD_TO_PLAYLIST_EN = Pattern.compile(
            "(?i)(?:add|save|put)\\s+(.+?)\\s+(?:to|into)\\s+(?:playlist\\s+)?(.+)");
    private static final Pattern ADD_TO_PLAYLIST_ZH = Pattern.compile(
            "(?:把|将)?\\s*(.+?)\\s*(?:加入|添加到|加到|放进|存到)\\s*(?:歌单|列表)?\\s*(.+)");
    private static final Pattern PLAYLIST_BY_NAME_EN = Pattern.compile(
            "(?i)(?:play|open)\\s+(?:playlist\\s+)(.+)");
    private static final Pattern PLAYLIST_BY_NAME_ZH = Pattern.compile(
            "(?:播放|打开)\\s*(?:歌单|列表)\\s*(.+)");

    public ParsedAgentCommand parse(String content) {
        String normalized = content == null ? "" : content.trim();
        String lowered = normalized.toLowerCase();

        ParsedAgentCommand rename = parseRenamePlaylist(normalized);
        if (rename != null) {
            return rename;
        }

        ParsedAgentCommand addToPlaylist = parseAddToPlaylist(normalized);
        if (addToPlaylist != null && containsPlaylistWord(normalized)) {
            return addToPlaylist;
        }

        ParsedAgentCommand playPlaylist = parsePlaylistPlayback(normalized);
        if (playPlaylist != null) {
            return playPlaylist;
        }

        if (isPlaylistCreate(normalized, lowered)) {
            return new ParsedAgentCommand(AgentIntent.CREATE_PLAYLIST, cleanPlaylistName(removeCreatePlaylistWords(normalized)));
        }
        if (isPlaylistDelete(normalized, lowered)) {
            return new ParsedAgentCommand(AgentIntent.DELETE_PLAYLIST, cleanPlaylistName(removeDeletePlaylistWords(normalized)));
        }
        if (isPlaylistList(normalized, lowered)) {
            return new ParsedAgentCommand(AgentIntent.LIST_PLAYLISTS, normalized);
        }
        if (isInsertNext(normalized, lowered)) {
            return new ParsedAgentCommand(AgentIntent.INSERT_TRACK_NEXT, cleanTrackQuery(removeInsertNextWords(normalized)));
        }
        if (isQueueAppend(normalized, lowered)) {
            return new ParsedAgentCommand(AgentIntent.ADD_TRACK_TO_QUEUE, cleanTrackQuery(removeQueueWords(normalized)));
        }
        if (containsAny(lowered, "pause", "暂停", "停一下")) {
            return new ParsedAgentCommand(AgentIntent.PAUSE, normalized);
        }
        if (containsAny(lowered, "next", "下一首", "切歌")) {
            return new ParsedAgentCommand(AgentIntent.NEXT, normalized);
        }
        if (containsAny(lowered, "previous", "上一首", "前一首")) {
            return new ParsedAgentCommand(AgentIntent.PREVIOUS, normalized);
        }
        if (containsAny(lowered, "play", "播放", "来点", "播点")) {
            return new ParsedAgentCommand(AgentIntent.PLAY, cleanTrackQuery(removePlayWords(normalized)));
        }
        if (containsAny(lowered, "search", "搜索", "找", "想听")) {
            return new ParsedAgentCommand(AgentIntent.SEARCH, cleanTrackQuery(removeSearchWords(normalized)));
        }
        return new ParsedAgentCommand(AgentIntent.CHAT, normalized);
    }

    private ParsedAgentCommand parseRenamePlaylist(String content) {
        Matcher english = RENAME_PLAYLIST_EN.matcher(content);
        if (english.matches()) {
            return renameCommand(english.group(1), english.group(2));
        }

        Matcher chinese = RENAME_PLAYLIST_ZH.matcher(content);
        if (chinese.matches()) {
            return renameCommand(chinese.group(1), chinese.group(2));
        }
        return null;
    }

    private ParsedAgentCommand parseAddToPlaylist(String content) {
        Matcher english = ADD_TO_PLAYLIST_EN.matcher(content);
        if (english.matches()) {
            return addToPlaylistCommand(english.group(1), english.group(2));
        }

        Matcher chinese = ADD_TO_PLAYLIST_ZH.matcher(content);
        if (chinese.matches()) {
            return addToPlaylistCommand(chinese.group(1), chinese.group(2));
        }
        return null;
    }

    private ParsedAgentCommand parsePlaylistPlayback(String content) {
        Matcher english = PLAYLIST_BY_NAME_EN.matcher(content);
        if (english.matches()) {
            return new ParsedAgentCommand(AgentIntent.PLAY_PLAYLIST, cleanPlaylistName(english.group(1)));
        }

        Matcher chinese = PLAYLIST_BY_NAME_ZH.matcher(content);
        if (chinese.matches()) {
            return new ParsedAgentCommand(AgentIntent.PLAY_PLAYLIST, cleanPlaylistName(chinese.group(1)));
        }
        return null;
    }

    private ParsedAgentCommand renameCommand(String playlist, String name) {
        String playlistName = cleanPlaylistName(playlist);
        String nextName = cleanPlaylistName(name);
        return new ParsedAgentCommand(
                AgentIntent.RENAME_PLAYLIST,
                playlistName,
                Map.of("playlist", playlistName, "name", nextName)
        );
    }

    private ParsedAgentCommand addToPlaylistCommand(String track, String playlist) {
        String trackQuery = cleanTrackQuery(track);
        String playlistName = cleanPlaylistName(playlist);
        return new ParsedAgentCommand(
                AgentIntent.ADD_TRACK_TO_PLAYLIST,
                trackQuery,
                Map.of("track", trackQuery, "playlist", playlistName)
        );
    }

    private boolean isPlaylistCreate(String content, String lowered) {
        return containsPlaylistWord(content) && containsAny(lowered, "create", "new", "创建", "新建", "建个", "建一个");
    }

    private boolean isPlaylistDelete(String content, String lowered) {
        return containsPlaylistWord(content) && containsAny(lowered, "delete", "remove", "删除", "删掉", "移除");
    }

    private boolean isPlaylistList(String content, String lowered) {
        return containsPlaylistWord(content)
                && containsAny(lowered, "list", "show", "有哪些", "列出", "查看", "看看");
    }

    private boolean isQueueAppend(String content, String lowered) {
        return containsAny(lowered, "queue", "队列")
                && containsAny(lowered, "add", "append", "加入", "添加", "加到", "放进");
    }

    private boolean isInsertNext(String content, String lowered) {
        return containsAny(lowered, "next up", "insert next", "play next", "下一首播放", "下首播放", "插到下一首");
    }

    private boolean containsPlaylistWord(String content) {
        String lowered = content.toLowerCase();
        return containsAny(lowered, "playlist", "歌单", "列表");
    }

    private String removeCreatePlaylistWords(String content) {
        return content
                .replaceAll("(?i)create|new|playlist", "")
                .replace("创建", "")
                .replace("新建", "")
                .replace("建个", "")
                .replace("建一个", "")
                .replace("歌单", "")
                .replace("列表", "")
                .trim();
    }

    private String removeDeletePlaylistWords(String content) {
        return content
                .replaceAll("(?i)delete|remove|playlist", "")
                .replace("删除", "")
                .replace("删掉", "")
                .replace("移除", "")
                .replace("歌单", "")
                .replace("列表", "")
                .trim();
    }

    private String removeQueueWords(String content) {
        return content
                .replaceAll("(?i)add|append|queue", "")
                .replace("加入", "")
                .replace("添加", "")
                .replace("加到", "")
                .replace("放进", "")
                .replace("队列", "")
                .trim();
    }

    private String removeInsertNextWords(String content) {
        return content
                .replaceAll("(?i)next up|insert next|play next", "")
                .replace("下一首播放", "")
                .replace("下首播放", "")
                .replace("插到下一首", "")
                .trim();
    }

    private String removePlayWords(String content) {
        return content
                .replaceAll("(?i)play", "")
                .replace("播放", "")
                .replace("来点", "")
                .replace("播点", "")
                .trim();
    }

    private String removeSearchWords(String content) {
        return content
                .replaceAll("(?i)search", "")
                .replace("搜索", "")
                .replace("想听", "")
                .replace("找一下", "")
                .replace("找", "")
                .trim();
    }

    private String cleanPlaylistName(String value) {
        return stripWrappingPunctuation(value)
                .replaceAll("(?i)^playlist\\s+", "")
                .replaceAll("^(歌单|列表)\\s*", "")
                .replaceAll("\\s*(歌单|列表)$", "")
                .trim();
    }

    private String cleanTrackQuery(String value) {
        return stripWrappingPunctuation(value)
                .replaceAll("(?i)^track\\s+", "")
                .trim();
    }

    private String stripWrappingPunctuation(String value) {
        if (value == null) {
            return "";
        }
        return value
                .trim()
                .replaceAll("^[\"'“”‘’《》]+", "")
                .replaceAll("[\"'“”‘’《》。.!！?？]+$", "")
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
