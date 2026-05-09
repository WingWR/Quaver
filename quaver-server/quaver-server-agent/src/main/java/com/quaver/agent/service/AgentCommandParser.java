package com.quaver.agent.service;

import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class AgentCommandParser {

    private static final String SELECTION_MODE = "selectionMode";
    private static final String SELECTION_SINGLE = "single";
    private static final String SELECTION_COLLECTION = "collection";

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
            "(?:播放|打开)\\s*歌单\\s*(.+)");

    public ParsedAgentCommand parse(String content) {
        String normalized = content == null ? "" : content.trim();
        String lowered = normalized.toLowerCase();

        ParsedAgentCommand rename = parseRenamePlaylist(normalized);
        if (rename != null) {
            return rename;
        }

        if (isQueueClear(normalized, lowered)) {
            return new ParsedAgentCommand(AgentIntent.CLEAR_QUEUE, "");
        }

        if (isQueueRemoval(normalized, lowered)) {
            String query = cleanTrackQuery(removeQueueRemovalWords(normalized));
            return new ParsedAgentCommand(AgentIntent.REMOVE_TRACK_FROM_QUEUE, query,
                    Map.of(SELECTION_MODE, SELECTION_SINGLE));
        }

        if (isQueueAppend(normalized, lowered)) {
            String query = cleanTrackQuery(removeQueueWords(normalized));
            return new ParsedAgentCommand(AgentIntent.ADD_TRACK_TO_QUEUE, query,
                    Map.of(SELECTION_MODE, inferSelectionMode(normalized, query)));
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
            String query = cleanTrackQuery(removeInsertNextWords(normalized));
            return new ParsedAgentCommand(AgentIntent.INSERT_TRACK_NEXT, query,
                    Map.of(SELECTION_MODE, SELECTION_SINGLE));
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
        if (isPlayRequest(normalized, lowered)) {
            String query = cleanTrackQuery(removePlayWords(normalized));
            return new ParsedAgentCommand(AgentIntent.PLAY, query,
                    Map.of(SELECTION_MODE, inferSelectionMode(normalized, query)));
        }
        if (isSearchRequest(normalized, lowered)) {
            String query = cleanTrackQuery(removeSearchWords(normalized));
            return new ParsedAgentCommand(AgentIntent.SEARCH, query,
                    Map.of("resultPresentation", "track_cards",
                            SELECTION_MODE, inferSelectionMode(normalized, query)));
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
                Map.of("track", trackQuery, "playlist", playlistName, SELECTION_MODE, SELECTION_SINGLE)
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
        return containsQueueWord(lowered)
                && containsAny(lowered, "add", "append", "加入", "添加", "加到", "放进");
    }

    private boolean isInsertNext(String content, String lowered) {
        return containsAny(lowered, "next up", "insert next", "play next", "move to front",
                "下一首播放", "下首播放", "插到下一首", "移到最前", "移至最前", "放到最前", "置顶播放");
    }

    private boolean isQueueRemoval(String content, String lowered) {
        return containsQueueWord(lowered)
                && containsAny(lowered, "remove", "delete", "移除", "移出", "删掉", "删除");
    }

    private boolean isQueueClear(String content, String lowered) {
        return containsQueueWord(lowered)
                && containsAny(lowered, "clear", "empty", "清空", "清除", "清掉", "全部移除", "全部删除");
    }

    private boolean isPlayRequest(String content, String lowered) {
        return containsAny(lowered, "play", "播放", "来点", "播点", "想听")
                && !isSearchRequest(content, lowered);
    }

    private boolean isSearchRequest(String content, String lowered) {
        return containsAny(lowered, "search", "搜索", "搜一下", "搜搜", "查找", "找一下", "找找");
    }

    private boolean containsPlaylistWord(String content) {
        String lowered = content.toLowerCase();
        return containsAny(lowered, "playlist", "歌单")
                || (lowered.contains("列表") && !containsQueueWord(lowered));
    }

    private boolean containsQueueWord(String lowered) {
        return containsAny(lowered, "queue", "队列", "播放队列", "播放列表");
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
                .replaceAll("(?i)add|append|to|into|queue", "")
                .replace("加入", "")
                .replace("添加", "")
                .replace("加到", "")
                .replace("放进", "")
                .replace("到", "")
                .replace("播放队列", "")
                .replace("播放列表", "")
                .replace("队列", "")
                .trim();
    }

    private String removeQueueRemovalWords(String content) {
        return content
                .replaceAll("(?i)remove|delete|from|queue", "")
                .replace("移除", "")
                .replace("移出", "")
                .replace("删掉", "")
                .replace("删除", "")
                .replace("从", "")
                .replace("里", "")
                .replace("播放队列", "")
                .replace("播放列表", "")
                .replace("队列", "")
                .trim();
    }

    private String removeInsertNextWords(String content) {
        return content
                .replaceAll("(?i)next up|insert next|play next|move to front", "")
                .replace("下一首播放", "")
                .replace("下首播放", "")
                .replace("插到下一首", "")
                .replace("移到最前", "")
                .replace("移至最前", "")
                .replace("放到最前", "")
                .replace("置顶播放", "")
                .trim();
    }

    private String removePlayWords(String content) {
        return content
                .replaceAll("(?i)play", "")
                .replace("播放", "")
                .replace("来点", "")
                .replace("播点", "")
                .replace("想听一下", "")
                .replace("想听", "")
                .trim();
    }

    private String removeSearchWords(String content) {
        return content
                .replaceAll("(?i)search", "")
                .replace("搜索一下", "")
                .replace("搜索", "")
                .replace("搜一下", "")
                .replace("搜搜", "")
                .replace("查找", "")
                .replace("找一下", "")
                .replace("找找", "")
                .replace("找", "")
                .trim();
    }

    private String inferSelectionMode(String content, String query) {
        String lowered = content.toLowerCase();
        if (containsAny(lowered,
                "single", "one song", "one track", "specific song", "this song", "that song",
                "\u4e00\u9996", "\u4e00\u66f2", "\u8fd9\u9996", "\u90a3\u9996", "\u67d0\u9996",
                "\u5355\u66f2")) {
            return SELECTION_SINGLE;
        }
        if (containsAny(lowered,
                "artist", "songs by", "some songs", "several songs", "multiple songs",
                "\u6b4c\u624b", "\u7684\u6b4c", "\u7684\u4f5c\u54c1", "\u4e00\u4e9b",
                "\u51e0\u9996", "\u591a\u9996", "\u63a8\u8350", "\u6765\u70b9",
                "\u968f\u4fbf", "\u968f\u673a", "\u5408\u96c6", "\u98ce\u683c")) {
            return SELECTION_COLLECTION;
        }
        if (containsAny(lowered,
                "artist", "songs by", "some songs", "several songs", "歌手", "的歌", "一些", "几首", "多首",
                "歌单", "推荐", "来点", "播点", "随机", "随便", "合集")) {
            return SELECTION_COLLECTION;
        }
        if (containsAny(lowered,
                "single", "track", "song", "这首", "那首", "某首", "一首", "单曲", "歌曲", "《")) {
            return SELECTION_SINGLE;
        }
        return query.isBlank() ? SELECTION_COLLECTION : SELECTION_SINGLE;
    }

    private String cleanPlaylistName(String value) {
        return stripWrappingPunctuation(value)
                .replaceAll("(?i)^playlist\\s+", "")
                .replaceAll("^(请|帮我|麻烦)\\s*", "")
                .replaceAll("^(一个|一份)?(叫做|叫|名为|名称为|为)\\s*", "")
                .replaceAll("^(歌单|列表)\\s*", "")
                .replaceAll("\\s*(歌单|列表)$", "")
                .replaceAll("的$", "")
                .trim();
    }

    private String cleanTrackQuery(String value) {
        return stripWrappingPunctuation(value)
                .replaceAll("(?i)^track\\s+", "")
                .replaceAll("^(请|帮我|麻烦|把|将)\\s*", "")
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
