package com.quaver.agent.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quaver.common.config.QuaverAiProperties;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class OpenAiResponsesClient {

    private final RestClient.Builder restClientBuilder;
    private final ObjectMapper objectMapper;
    private final QuaverAiProperties aiProperties;

    public OpenAiResponsesClient(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            QuaverAiProperties aiProperties
    ) {
        this.restClientBuilder = restClientBuilder;
        this.objectMapper = objectMapper;
        this.aiProperties = aiProperties;
    }

    public boolean isConfigured() {
        return aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank();
    }

    public String generateText(String model, String developerInstructions, String userInput) {
        if (!isConfigured()) {
            throw new IllegalStateException("OpenAI API key is not configured.");
        }

        Map<String, Object> body = Map.of(
                "model", model,
                "input", List.of(
                        Map.of(
                                "role", "developer",
                                "content", List.of(Map.of("type", "input_text", "text", developerInstructions))
                        ),
                        Map.of(
                                "role", "user",
                                "content", List.of(Map.of("type", "input_text", "text", userInput))
                        )
                )
        );

        JsonNode response = restClientBuilder
                .baseUrl(trimTrailingSlash(aiProperties.getBaseUrl()))
                .build()
                .post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiProperties.getApiKey())
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        return extractOutputText(response);
    }

    private String extractOutputText(JsonNode response) {
        if (response == null) {
            return "";
        }

        JsonNode directOutputText = response.get("output_text");
        if (directOutputText != null && directOutputText.isTextual()) {
            return directOutputText.asText().trim();
        }

        StringBuilder builder = new StringBuilder();
        JsonNode output = response.get("output");
        if (output != null && output.isArray()) {
            for (JsonNode item : output) {
                JsonNode content = item.get("content");
                if (content == null || !content.isArray()) {
                    continue;
                }
                for (JsonNode contentItem : content) {
                    JsonNode text = contentItem.get("text");
                    if (text != null && text.isTextual()) {
                        builder.append(text.asText());
                    }
                }
            }
        }

        return builder.toString().trim();
    }

    public JsonNode readJson(String value) {
        try {
            return objectMapper.readTree(stripCodeFence(value));
        } catch (Exception ignored) {
            return objectMapper.createObjectNode();
        }
    }

    private String stripCodeFence(String value) {
        if (value == null) {
            return "";
        }

        String trimmed = value.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        return trimmed
                .replaceFirst("^```(?:json)?\\s*", "")
                .replaceFirst("\\s*```$", "")
                .trim();
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://api.openai.com/v1";
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
