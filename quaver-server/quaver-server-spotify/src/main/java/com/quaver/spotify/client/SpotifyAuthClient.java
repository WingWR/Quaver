package com.quaver.spotify.client;

import com.quaver.spotify.config.SpotifyProperties;
import com.quaver.spotify.model.SpotifyTokenSnapshot;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class SpotifyAuthClient {

    private static final String AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
    private static final String TOKEN_URL = "https://accounts.spotify.com/api/token";

    private final RestClient restClient;
    private final SpotifyProperties spotifyProperties;
    private final Clock clock;

    public SpotifyAuthClient(RestClient.Builder restClientBuilder, SpotifyProperties spotifyProperties, Clock clock) {
        this.restClient = restClientBuilder.build();
        this.spotifyProperties = spotifyProperties;
        this.clock = clock;
    }

    public URI buildAuthorizationUri(String state) {
        return UriComponentsBuilder.fromHttpUrl(AUTHORIZE_URL)
                .queryParam("response_type", "code")
                .queryParam("client_id", spotifyProperties.getClientId())
                .queryParam("scope", String.join(" ", spotifyProperties.getScopes()))
                .queryParam("redirect_uri", spotifyProperties.getRedirectUri())
                .queryParam("state", state)
                .build(true)
                .toUri();
    }

    public SpotifyTokenSnapshot exchangeAuthorizationCode(String code) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("code", code);
        form.add("redirect_uri", spotifyProperties.getRedirectUri());
        return requestToken(form);
    }

    public SpotifyTokenSnapshot refreshAccessToken(String refreshToken) {
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);
        return requestToken(form);
    }

    private SpotifyTokenSnapshot requestToken(MultiValueMap<String, String> form) {
        TokenResponse response = restClient.post()
                .uri(TOKEN_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .header("Authorization", basicAuthorization())
                .body(form)
                .retrieve()
                .body(TokenResponse.class);

        if (response == null || response.accessToken() == null) {
            throw new IllegalStateException("Spotify token response is empty.");
        }

        List<String> scopes = response.scope() == null || response.scope().isBlank()
                ? spotifyProperties.getScopes()
                : Arrays.stream(response.scope().trim().split("\\s+"))
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .toList();

        return new SpotifyTokenSnapshot(
                response.accessToken(),
                response.refreshToken(),
                response.tokenType(),
                scopes,
                LocalDateTime.now(clock).plusSeconds(response.expiresIn())
        );
    }

    private String basicAuthorization() {
        String raw = spotifyProperties.getClientId() + ":" + spotifyProperties.getClientSecret();
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private record TokenResponse(
            @com.fasterxml.jackson.annotation.JsonProperty("access_token") String accessToken,
            @com.fasterxml.jackson.annotation.JsonProperty("refresh_token") String refreshToken,
            @com.fasterxml.jackson.annotation.JsonProperty("token_type") String tokenType,
            @com.fasterxml.jackson.annotation.JsonProperty("expires_in") Long expiresIn,
            String scope
    ) {
    }
}
