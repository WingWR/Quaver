package com.quaver.agent.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.quaver.common.config.QuaverAiProperties;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

@Component
public class DeepSeekChatClient {

    private final ObjectMapper objectMapper;
    private final QuaverAiProperties aiProperties;
    private final HttpClient httpClient;

    public DeepSeekChatClient(
            ObjectMapper objectMapper,
            QuaverAiProperties aiProperties
    ) {
        this.objectMapper = objectMapper;
        this.aiProperties = aiProperties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public boolean isConfigured() {
        return aiProperties.getApiKey() != null && !aiProperties.getApiKey().isBlank();
    }

    public String generateText(String model, String developerInstructions, String userInput) {
        if (!isConfigured()) {
            throw new IllegalStateException("AI API key is not configured.");
        }

        try {
            HttpRequest request = baseRequest("application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
                            chatCompletionBody(model, developerInstructions, userInput, false)
                    )))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            ensureSuccessful(response.statusCode(), response.body());
            return extractOutputText(objectMapper.readTree(response.body()));
        } catch (IOException exception) {
            throw new IllegalStateException("AI request failed.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI request was interrupted.", exception);
        }
    }

    public String streamText(String model, String developerInstructions, String userInput, Consumer<String> onDelta) {
        if (!isConfigured()) {
            throw new IllegalStateException("AI API key is not configured.");
        }

        try {
            HttpRequest request = baseRequest("text/event-stream")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
                            chatCompletionBody(model, developerInstructions, userInput, true)
                    )))
                    .build();

            HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                ensureSuccessful(response.statusCode(), readBody(response.body()));
            }
            return readChatCompletionStream(response.body(), onDelta);
        } catch (IOException exception) {
            throw new IllegalStateException("AI streaming request failed.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI streaming request was interrupted.", exception);
        }
    }

    private Map<String, Object> chatCompletionBody(String model, String developerInstructions, String userInput, boolean stream) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", resolveModel(model));
        body.put("messages", List.of(
                Map.of("role", "system", "content", Objects.toString(developerInstructions, "")),
                Map.of("role", "user", "content", Objects.toString(userInput, ""))
        ));
        body.put("thinking", Map.of("type", "disabled"));
        body.put("stream", stream);
        return body;
    }

    private HttpRequest.Builder baseRequest(String accept) {
        return HttpRequest.newBuilder(URI.create(chatCompletionsUrl()))
                .timeout(Duration.ofSeconds(90))
                .header(HttpHeaders.CONTENT_TYPE, "application/json")
                .header(HttpHeaders.ACCEPT, accept)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + aiProperties.getApiKey());
    }

    private String readChatCompletionStream(InputStream inputStream, Consumer<String> onDelta) throws IOException {
        StringBuilder fullText = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (!trimmed.startsWith("data:")) {
                    continue;
                }

                String data = trimmed.substring("data:".length()).trim();
                if (data.isBlank()) {
                    continue;
                }
                if ("[DONE]".equals(data)) {
                    break;
                }

                JsonNode chunk = objectMapper.readTree(data);
                String delta = extractChatDelta(chunk);
                if (!delta.isEmpty()) {
                    fullText.append(delta);
                    onDelta.accept(delta);
                }
            }
        }
        return fullText.toString().trim();
    }

    private String extractChatDelta(JsonNode response) {
        StringBuilder builder = new StringBuilder();
        JsonNode choices = response == null ? null : response.get("choices");
        if (choices != null && choices.isArray()) {
            for (JsonNode choice : choices) {
                appendContent(builder, choice.path("delta").get("content"));
                appendContent(builder, choice.path("message").get("content"));
            }
        }
        return builder.toString();
    }

    private String extractOutputText(JsonNode response) {
        if (response == null) {
            return "";
        }

        String chatText = extractChatText(response);
        if (!chatText.isBlank()) {
            return chatText.trim();
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

    private String extractChatText(JsonNode response) {
        StringBuilder builder = new StringBuilder();
        JsonNode choices = response.get("choices");
        if (choices != null && choices.isArray()) {
            for (JsonNode choice : choices) {
                appendContent(builder, choice.path("message").get("content"));
            }
        }
        return builder.toString();
    }

    private void appendContent(StringBuilder builder, JsonNode content) {
        if (content == null || content.isMissingNode() || content.isNull()) {
            return;
        }
        if (content.isTextual()) {
            builder.append(content.asText());
            return;
        }
        if (content.isArray()) {
            for (JsonNode item : content) {
                JsonNode text = item.get("text");
                if (text != null && text.isTextual()) {
                    builder.append(text.asText());
                }
            }
        }
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

    private String resolveModel(String model) {
        return model == null || model.isBlank() ? aiProperties.getModel() : model.trim();
    }

    private void ensureSuccessful(int statusCode, String body) {
        if (statusCode >= 200 && statusCode < 300) {
            return;
        }
        throw new IllegalStateException("AI request failed with status " + statusCode + ": " + sanitizeErrorBody(body));
    }

    private String sanitizeErrorBody(String body) {
        if (body == null || body.isBlank()) {
            return "empty response body";
        }
        return body.length() <= 600 ? body : body.substring(0, 600);
    }

    private String readBody(InputStream inputStream) throws IOException {
        return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
    }

    private String chatCompletionsUrl() {
        String baseUrl = trimTrailingSlash(aiProperties.getBaseUrl());
        if (baseUrl.endsWith("/chat/completions")) {
            return baseUrl;
        }
        return baseUrl + "/chat/completions";
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "https://api.deepseek.com";
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
