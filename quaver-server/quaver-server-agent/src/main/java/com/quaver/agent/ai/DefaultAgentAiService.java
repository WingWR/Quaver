package com.quaver.agent.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import com.quaver.common.config.QuaverAiProperties;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;

@Service
public class DefaultAgentAiService implements AgentAiService {

    private final DeepSeekChatClient deepSeekChatClient;
    private final QuaverAiProperties aiProperties;

    public DefaultAgentAiService(DeepSeekChatClient deepSeekChatClient, QuaverAiProperties aiProperties) {
        this.deepSeekChatClient = deepSeekChatClient;
        this.aiProperties = aiProperties;
    }

    @Override
    public boolean isConfigured() {
        return deepSeekChatClient.isConfigured();
    }

    @Override
    public Optional<ParsedAgentCommand> parseCommand(String userMessage, Map<String, Object> metadata) {
        String content = userMessage == null ? "" : userMessage.trim();
        if (content.isBlank() || !isConfigured()) {
            return Optional.empty();
        }

        String prompt = """
                You are Quaver Agent's action planner. Convert the user's message into one safe JSON command.
                Return only compact JSON with this shape:
                {"intent":"PLAY","query":"...","arguments":{"selectionMode":"single|collection","track":"...","playlist":"...","name":"...","playbackCommand":"..."}}

                Available backend capabilities:
                - SEARCH: search tracks and show result cards; no playback or library mutation.
                - PLAY: start playback from Spotify/cache search results.
                - PLAY_PLAYLIST: play an existing Quaver playlist by name or id.
                - PAUSE, NEXT, PREVIOUS: playback controls.
                - LIST_PLAYLISTS, CREATE_PLAYLIST, RENAME_PLAYLIST, DELETE_PLAYLIST.
                - ADD_TRACK_TO_PLAYLIST: add exactly one best matching track to a playlist unless the user explicitly asks for multiple.
                - ADD_TRACK_TO_QUEUE: add exactly one best matching track to the queue.
                - REMOVE_TRACK_FROM_QUEUE: remove one matching track from the current queue.
                - CLEAR_QUEUE: clear all tracks from the current queue and stop queue playback.
                - INSERT_TRACK_NEXT: add exactly one best matching track as next up, or move an existing queued track to next up/front.
                - CHAT: music conversation only, no tool call.

                Planning rules:
                - Use SEARCH when the user says search/find/show/listen candidates and does not ask to play now.
                - Use PLAY when the user asks to hear/play/listen now.
                - If the user names a specific song, set selectionMode to "single"; the executor will use the top search result only.
                - If the user asks for songs by an artist, genre, mood, scene, or says "some songs", set selectionMode to "collection".
                - Never turn ADD_TRACK_TO_PLAYLIST into PLAY or queue mutation.
                - In Chinese, "播放列表" or "播放队列" means the current queue; never treat it as a saved playlist.
                - For "从播放列表/播放队列移除/删除 X", use REMOVE_TRACK_FROM_QUEUE.
                - For "清空播放列表/播放队列", use CLEAR_QUEUE.
                - Never call more than one capability. Pick the primary safe action.
                - Keep query short and searchable. Preserve artist names and song titles.
                - If unsure whether a target playlist exists, still extract its name and let the executor resolve it.
                - If the user is only chatting about music, use CHAT.
                """;

        String input = """
                User message: %s
                UI metadata: %s
                """.formatted(quote(content), quote(String.valueOf(metadata == null ? Map.of() : metadata)));

        try {
            String response = deepSeekChatClient.generateText(aiProperties.getAgentModel(), prompt, input);
            JsonNode node = deepSeekChatClient.readJson(response);
            AgentIntent intent = parseIntent(node.path("intent").asText(""));
            if (intent == null) {
                return Optional.empty();
            }

            String query = node.path("query").asText("").trim();
            Map<String, String> arguments = parseArguments(node.path("arguments"));
            return Optional.of(new ParsedAgentCommand(intent, query, arguments));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    @Override
    public String normalizeSearchQuery(AgentTrackSearchRequest request) {
        String rawQuery = request.getQuery() == null ? "" : request.getQuery().trim();
        if (rawQuery.isBlank() || !isConfigured()) {
            return rawQuery;
        }

        String prompt = """
                You prepare single-track music search queries for a Spotify-backed player.
                Return only compact JSON with this shape: {"query":"..."}.
                Preserve artist names, exact song names, languages, genres, and user intent.
                Remove filler words and do not invent unavailable facts.
                Never expand the request into a playlist, mix, recommendation set, or multiple-song query unless the user explicitly typed multiple song names.
                Prefer exact track lookup phrasing over broad thematic wording.
                """;

        String input = """
                User query: %s
                """.formatted(
                rawQuery
        );

        try {
            String response = deepSeekChatClient.generateText(aiProperties.getSearchModel(), prompt, input);
            JsonNode node = deepSeekChatClient.readJson(response);
            String normalized = node.path("query").asText("").trim();
            return normalized.isBlank() ? rawQuery : normalized;
        } catch (Exception ignored) {
            return rawQuery;
        }
    }

    @Override
    public String composeAgentReply(String userMessage, ParsedAgentCommand command, String deterministicReply, String model) {
        if (!isConfigured()) {
            return fallbackReply(deterministicReply);
        }

        try {
            String response = deepSeekChatClient.generateText(
                    resolveModel(model),
                    replyPrompt(command),
                    replyInput(userMessage, command, deterministicReply)
            );
            if (response == null || response.isBlank()) {
                return fallbackReply(deterministicReply);
            }
            return response;
        } catch (Exception exception) {
            return fallbackReply(deterministicReply);
        }
    }

    @Override
    public String streamAgentReply(String userMessage, ParsedAgentCommand command, String deterministicReply, String model,
                                   Consumer<String> onDelta) {
        if (!isConfigured()) {
            String fallback = fallbackReply(deterministicReply);
            onDelta.accept(fallback);
            return fallback;
        }

        AtomicBoolean emitted = new AtomicBoolean(false);
        Consumer<String> trackingConsumer = delta -> {
            if (delta != null && !delta.isEmpty()) {
                emitted.set(true);
                onDelta.accept(delta);
            }
        };

        try {
            String response = deepSeekChatClient.streamText(
                    resolveModel(model),
                    replyPrompt(command),
                    replyInput(userMessage, command, deterministicReply),
                    trackingConsumer
            );
            if (response == null || response.isBlank()) {
                String fallback = fallbackReply(deterministicReply);
                if (!emitted.get()) {
                    onDelta.accept(fallback);
                }
                return fallback;
            }
            return response;
        } catch (Exception exception) {
            String fallback = fallbackReply(deterministicReply);
            if (!emitted.get()) {
                onDelta.accept(fallback);
            }
            return fallback;
        }
    }

    private String replyPrompt(ParsedAgentCommand command) {
        if (command.intent() == AgentIntent.CHAT) {
            return """
                    You are Quaver Agent, a music-focused assistant embedded in a music player.
                    Treat the input as a formal Agent request and return an Agent response, not a raw chat completion.
                    Have a natural conversation with the user, but keep your identity and expertise centered on music.
                    You can discuss songs, artists, albums, genres, moods, listening context, playlists, queue planning, lyrics, and playback ideas.
                    If the user asks something unrelated to music, answer briefly if helpful, then gently steer the conversation back to music.
                    Do not claim you changed playlists, queue, or playback unless a backend result explicitly says so.
                    Reply in the same language as the user when possible.
                    Keep the answer concise and warm, usually under 120 words.
                    """;
        }

        return """
                You are Quaver Agent, a music-focused assistant embedded in a music player.
                The backend has already parsed the user's request and executed any available music action.
                Treat the input as a formal Agent request and return an Agent response that summarizes the completed action.
                Rewrite the deterministic backend result into a concise, natural assistant reply.
                Do not claim you performed actions that the backend result does not mention.
                Keep concrete search, playback, playlist, queue status, track counts, and limitations intact.
                Reply in the same language as the user when possible.
                Keep the answer under 90 words.
                """;
    }

    private String replyInput(String userMessage, ParsedAgentCommand command, String deterministicReply) {
        if (command.intent() == AgentIntent.CHAT) {
            return """
                    Agent request:
                    {
                      "agent": "Quaver Agent",
                      "mode": "music_chat",
                      "userMessage": %s,
                      "parsedIntent": "%s",
                      "parsedQuery": %s,
                      "availableMusicActions": [
                        "search tracks",
                        "play tracks or playlists",
                        "pause playback",
                        "skip tracks",
                        "create, rename, or delete playlists",
                        "add tracks to playlists or queue",
                        "remove tracks from queue",
                        "clear the queue",
                        "move queued tracks to next up"
                      ]
                    }

                    Agent response contract:
                    - Return the assistant message the UI should show.
                    - Keep the conversation natural and music-focused.
                    - If the user wants a concrete library or playback change, tell them what exact command you can handle.
                    """.formatted(quote(userMessage), command.intent(), quote(command.query()));
        }

        return """
                Agent request:
                {
                  "agent": "Quaver Agent",
                  "mode": "music_action_result",
                  "userMessage": %s,
                  "parsedIntent": "%s",
                  "parsedQuery": %s,
                  "parsedArguments": "%s",
                  "backendResult": %s
                }

                Agent response contract:
                - Return the assistant message the UI should show.
                - Explain only what the backend result confirms.
                - Keep it natural, concise, and music-focused.
                """.formatted(
                quote(userMessage),
                command.intent(),
                quote(command.query()),
                command.arguments(),
                quote(deterministicReply)
        );
    }

    private String resolveModel(String requestedModel) {
        return requestedModel == null || requestedModel.isBlank()
                ? aiProperties.getAgentModel()
                : requestedModel;
    }

    private String fallbackReply(String deterministicReply) {
        if (deterministicReply == null || deterministicReply.isBlank()) {
            return "Agent action completed, but the AI reply service is temporarily unavailable.";
        }
        return deterministicReply;
    }

    private AgentIntent parseIntent(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        String normalized = value.trim()
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase();
        try {
            return AgentIntent.valueOf(normalized);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private Map<String, String> parseArguments(JsonNode argumentsNode) {
        if (argumentsNode == null || !argumentsNode.isObject()) {
            return Map.of();
        }

        Map<String, String> arguments = new LinkedHashMap<>();
        argumentsNode.fields().forEachRemaining(entry -> {
            JsonNode value = entry.getValue();
            if (value == null || value.isNull()) {
                return;
            }

            String textValue = value.isTextual() ? value.asText() : value.toString();
            if (!textValue.isBlank()) {
                arguments.put(entry.getKey(), textValue.trim());
            }
        });
        return arguments;
    }

    private String quote(String value) {
        if (value == null) {
            return "\"\"";
        }
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r") + "\"";
    }
}
