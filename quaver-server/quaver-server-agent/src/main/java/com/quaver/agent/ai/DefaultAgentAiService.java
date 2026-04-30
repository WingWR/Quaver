package com.quaver.agent.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.model.AgentIntent;
import com.quaver.agent.model.ParsedAgentCommand;
import com.quaver.common.config.QuaverAiProperties;
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
            throw new IllegalStateException("DeepSeek API key is not configured. Fill QUAVER_AI_API_KEY in quaver-server/.env and restart the backend.");
        }

        try {
            String response = deepSeekChatClient.generateText(
                    resolveModel(model),
                    replyPrompt(command),
                    replyInput(userMessage, command, deterministicReply)
            );
            if (response == null || response.isBlank()) {
                throw new IllegalStateException("DeepSeek returned an empty Agent response.");
            }
            return response;
        } catch (RuntimeException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("DeepSeek Agent request failed.", exception);
        }
    }

    @Override
    public String streamAgentReply(String userMessage, ParsedAgentCommand command, String deterministicReply, String model,
                                   Consumer<String> onDelta) {
        if (!isConfigured()) {
            throw new IllegalStateException("DeepSeek API key is not configured. Fill QUAVER_AI_API_KEY in quaver-server/.env and restart the backend.");
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
                throw new IllegalStateException("DeepSeek returned an empty Agent response.");
            }
            return response;
        } catch (RuntimeException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("DeepSeek Agent streaming request failed.", exception);
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
                        "add tracks to playlists or queue"
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
