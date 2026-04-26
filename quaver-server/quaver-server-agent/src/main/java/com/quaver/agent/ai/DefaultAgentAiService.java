package com.quaver.agent.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.quaver.agent.dto.AgentTrackSearchRequest;
import com.quaver.agent.model.ParsedAgentCommand;
import com.quaver.common.config.QuaverAiProperties;
import org.springframework.stereotype.Service;

@Service
public class DefaultAgentAiService implements AgentAiService {

    private final OpenAiResponsesClient openAiResponsesClient;
    private final QuaverAiProperties aiProperties;

    public DefaultAgentAiService(OpenAiResponsesClient openAiResponsesClient, QuaverAiProperties aiProperties) {
        this.openAiResponsesClient = openAiResponsesClient;
        this.aiProperties = aiProperties;
    }

    @Override
    public boolean isConfigured() {
        return openAiResponsesClient.isConfigured();
    }

    @Override
    public String normalizeSearchQuery(AgentTrackSearchRequest request) {
        String rawQuery = request.getQuery() == null ? "" : request.getQuery().trim();
        if (rawQuery.isBlank() || !isConfigured()) {
            return rawQuery;
        }

        String prompt = """
                You prepare music search queries for a Spotify-backed player.
                Return only compact JSON with this shape: {"query":"..."}.
                Preserve artist names, song names, languages, genres, moods, and user intent.
                Remove filler words and do not invent unavailable facts.
                """;

        String input = """
                User query: %s
                Selected playlist id: %s
                Playlist ids: %s
                Queue track ids: %s
                """.formatted(
                rawQuery,
                request.getSelectedPlaylistId(),
                request.getPlaylistIds(),
                request.getQueueTrackIds()
        );

        try {
            String response = openAiResponsesClient.generateText(aiProperties.getSearchModel(), prompt, input);
            JsonNode node = openAiResponsesClient.readJson(response);
            String normalized = node.path("query").asText("").trim();
            return normalized.isBlank() ? rawQuery : normalized;
        } catch (Exception ignored) {
            return rawQuery;
        }
    }

    @Override
    public String composeAgentReply(String userMessage, ParsedAgentCommand command, String deterministicReply, String model) {
        if (!isConfigured()) {
            return deterministicReply;
        }

        String prompt = """
                You are Quaver's music agent inside a player UI.
                Rewrite the deterministic backend result into a concise, helpful assistant reply.
                Do not claim you performed actions that the backend result does not mention.
                Keep concrete search/playback status, track counts, and limitations intact.
                Keep the answer under 90 words.
                """;

        String input = """
                User message: %s
                Parsed intent: %s
                Parsed query: %s
                Backend result: %s
                """.formatted(userMessage, command.intent(), command.query(), deterministicReply);

        try {
            String response = openAiResponsesClient.generateText(resolveModel(model), prompt, input);
            return response == null || response.isBlank() ? deterministicReply : response;
        } catch (Exception ignored) {
            return deterministicReply;
        }
    }

    private String resolveModel(String requestedModel) {
        return requestedModel == null || requestedModel.isBlank()
                ? aiProperties.getAgentModel()
                : requestedModel;
    }
}
