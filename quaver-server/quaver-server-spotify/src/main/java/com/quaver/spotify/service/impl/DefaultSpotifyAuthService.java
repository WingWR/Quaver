package com.quaver.spotify.service.impl;

import com.quaver.common.exception.BusinessException;
import com.quaver.spotify.client.SpotifyAuthClient;
import com.quaver.spotify.config.SpotifyProperties;
import com.quaver.spotify.dto.SpotifyAuthStatusDto;
import com.quaver.spotify.dto.SpotifyPlayerTokenDto;
import com.quaver.spotify.entity.SpotifyAuthorizationEntity;
import com.quaver.spotify.mapper.SpotifyAuthorizationMapper;
import com.quaver.spotify.model.SpotifyTokenSnapshot;
import com.quaver.spotify.service.SpotifyAuthService;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultSpotifyAuthService implements SpotifyAuthService {

    private static final String BRIDGE_ID = "bridge-default";
    private static final String STREAMING_SCOPE = "streaming";
    private static final List<String> FRONTEND_REQUIRED_SCOPES = List.of(
            STREAMING_SCOPE,
            "playlist-read-collaborative"
    );

    private final SpotifyAuthClient spotifyAuthClient;
    private final SpotifyAuthorizationMapper authorizationMapper;
    private final SpotifyProperties spotifyProperties;
    private final Clock clock;
    private final Map<String, LocalDateTime> validStates = new ConcurrentHashMap<>();
    private String catalogAccessToken;
    private LocalDateTime catalogAccessTokenExpiresAt;

    public DefaultSpotifyAuthService(
            SpotifyAuthClient spotifyAuthClient,
            SpotifyAuthorizationMapper authorizationMapper,
            SpotifyProperties spotifyProperties,
            Clock clock
    ) {
        this.spotifyAuthClient = spotifyAuthClient;
        this.authorizationMapper = authorizationMapper;
        this.spotifyProperties = spotifyProperties;
        this.clock = clock;
    }

    @Override
    public URI buildAuthorizationUri() {
        ensureBridgeConfigured();
        pruneExpiredStates();
        String state = UUID.randomUUID().toString();
        validStates.put(state, LocalDateTime.now(clock).plusMinutes(10));
        return spotifyAuthClient.buildAuthorizationUri(state);
    }

    @Override
    @Transactional
    public SpotifyAuthStatusDto handleAuthorizationCallback(String code, String state) {
        ensureBridgeConfigured();
        LocalDateTime expiresAt = validStates.remove(state);
        if (state == null || expiresAt == null || expiresAt.isBefore(LocalDateTime.now(clock))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify authorization state is invalid or expired.");
        }

        SpotifyTokenSnapshot snapshot = spotifyAuthClient.exchangeAuthorizationCode(code);
        saveSnapshot(snapshot);
        return toStatus(snapshot, "authorized", "Spotify bridge account is connected.");
    }

    @Override
    @Transactional
    public SpotifyAuthStatusDto getCurrentStatus() {
        if (!spotifyProperties.isEnabled()) {
            return baseStatus(false, false, null, "disabled", "Spotify bridge mode is disabled.");
        }
        if (!hasClientCredentials()) {
            return baseStatus(false, false, null, "missing-client-credentials",
                    "Spotify Client ID and Client Secret are required.");
        }
        if (isBlank(spotifyProperties.getRedirectUri())) {
            return baseStatus(false, false, null, "missing-redirect-uri",
                    "Spotify redirect URI is required.");
        }

        SpotifyAuthorizationEntity entity = authorizationMapper.selectById(BRIDGE_ID);
        if (entity != null) {
            LocalDateTime refreshThreshold = LocalDateTime.now(clock).plusMinutes(1);
            if (entity.getExpiresAt() != null && !entity.getExpiresAt().isAfter(refreshThreshold)) {
                try {
                    getValidAccessToken();
                    entity = authorizationMapper.selectById(BRIDGE_ID);
                } catch (RuntimeException exception) {
                    return baseStatus(true, false, null, "refresh-failed",
                            "Spotify authorization exists, but refreshing it failed. Please connect Spotify again.");
                }
            }

            return new SpotifyAuthStatusDto(
                    true,
                    true,
                    entity.getDeveloperAccount(),
                    spotifyProperties.getRedirectUri(),
                    spotifyProperties.getDefaultDeviceId(),
                    entity.getScopes(),
                    entity.getExpiresAt(),
                    hasConfiguredRefreshToken(),
                    "authorized",
                    missingScopes(entity.getScopes()).isEmpty()
                            ? "Spotify bridge account is connected."
                            : "Spotify is connected, but it needs a fresh authorization with: " + String.join(", ", missingScopes(entity.getScopes())) + "."
            );
        }

        Optional<SpotifyTokenSnapshot> configuredToken;
        try {
            configuredToken = refreshFromConfiguredToken();
        } catch (RuntimeException exception) {
            return baseStatus(true, false, null, "refresh-token-invalid",
                    "The configured Spotify refresh token could not be used. Please connect Spotify in the browser once.");
        }
        if (configuredToken.isPresent()) {
            return toStatus(configuredToken.get(), "authorized",
                    "Spotify bridge account was connected from the configured refresh token.");
        }

        return baseStatus(true, false, null, "needs-oauth",
                "Spotify needs one browser authorization before backend playback and library sync can work.");
    }

    @Override
    @Transactional
    public SpotifyPlayerTokenDto getPlayerToken() {
        String accessToken = getValidAccessToken()
                .orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST,
                        "Spotify bridge account has not completed authorization yet."));
        SpotifyAuthorizationEntity entity = authorizationMapper.selectById(BRIDGE_ID);

        if (entity == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "Spotify bridge account has not completed authorization yet.");
        }

        if (!hasScope(entity.getScopes(), STREAMING_SCOPE)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "Spotify authorization is missing the streaming scope. Connect Spotify again so the browser player can start.");
        }

        return new SpotifyPlayerTokenDto(
                accessToken,
                entity.getExpiresAt(),
                entity.getScopes()
        );
    }

    @Override
    @Transactional
    public Optional<String> getValidAccessToken() {
        if (!spotifyProperties.isEnabled() || !hasClientCredentials()) {
            return Optional.empty();
        }

        SpotifyAuthorizationEntity entity = authorizationMapper.selectById(BRIDGE_ID);
        if (entity == null) {
            return refreshFromConfiguredToken().map(SpotifyTokenSnapshot::accessToken);
        }

        LocalDateTime refreshThreshold = LocalDateTime.now(clock).plusMinutes(1);
        if (entity.getExpiresAt() != null && entity.getExpiresAt().isAfter(refreshThreshold)) {
            return Optional.ofNullable(entity.getAccessToken());
        }

        SpotifyTokenSnapshot refreshed = spotifyAuthClient.refreshAccessToken(entity.getRefreshToken());
        if (refreshed.refreshToken() == null || refreshed.refreshToken().isBlank()) {
            refreshed = new SpotifyTokenSnapshot(
                    refreshed.accessToken(),
                    entity.getRefreshToken(),
                    refreshed.tokenType(),
                    refreshed.scopes(),
                    refreshed.expiresAt()
            );
        }
        saveSnapshot(refreshed);
        return Optional.ofNullable(refreshed.accessToken());
    }

    @Override
    public synchronized Optional<String> getCatalogAccessToken() {
        if (!spotifyProperties.isEnabled() || !hasClientCredentials()) {
            return Optional.empty();
        }

        LocalDateTime refreshThreshold = LocalDateTime.now(clock).plusMinutes(1);
        if (catalogAccessToken != null
                && !catalogAccessToken.isBlank()
                && catalogAccessTokenExpiresAt != null
                && catalogAccessTokenExpiresAt.isAfter(refreshThreshold)) {
            return Optional.of(catalogAccessToken);
        }

        SpotifyTokenSnapshot snapshot = spotifyAuthClient.requestClientCredentialsToken();
        catalogAccessToken = snapshot.accessToken();
        catalogAccessTokenExpiresAt = snapshot.expiresAt();
        return Optional.ofNullable(catalogAccessToken);
    }

    private Optional<SpotifyTokenSnapshot> refreshFromConfiguredToken() {
        if (!hasConfiguredRefreshToken()) {
            return Optional.empty();
        }

        SpotifyTokenSnapshot refreshed = spotifyAuthClient.refreshAccessToken(spotifyProperties.getBridgeRefreshToken());
        if (refreshed.refreshToken() == null || refreshed.refreshToken().isBlank()) {
            refreshed = new SpotifyTokenSnapshot(
                    refreshed.accessToken(),
                    spotifyProperties.getBridgeRefreshToken(),
                    refreshed.tokenType(),
                    refreshed.scopes(),
                    refreshed.expiresAt()
            );
        }
        saveSnapshot(refreshed);
        return Optional.of(refreshed);
    }

    private void saveSnapshot(SpotifyTokenSnapshot snapshot) {
        SpotifyAuthorizationEntity entity = authorizationMapper.selectById(BRIDGE_ID);
        if (entity == null) {
            entity = new SpotifyAuthorizationEntity();
            entity.setId(BRIDGE_ID);
            entity.setDeveloperAccount(spotifyProperties.getDeveloperAccount());
            entity.setAccessToken(snapshot.accessToken());
            entity.setRefreshToken(snapshot.refreshToken());
            entity.setTokenType(snapshot.tokenType());
            entity.setScopes(snapshot.scopes());
            entity.setExpiresAt(snapshot.expiresAt());
            authorizationMapper.insert(entity);
            return;
        }

        entity.setDeveloperAccount(spotifyProperties.getDeveloperAccount());
        entity.setAccessToken(snapshot.accessToken());
        entity.setRefreshToken(snapshot.refreshToken());
        entity.setTokenType(snapshot.tokenType());
        entity.setScopes(snapshot.scopes());
        entity.setExpiresAt(snapshot.expiresAt());
        authorizationMapper.updateById(entity);
    }

    private SpotifyAuthStatusDto toStatus(SpotifyTokenSnapshot snapshot, String mode, String message) {
        return new SpotifyAuthStatusDto(
                spotifyProperties.isEnabled(),
                true,
                spotifyProperties.getDeveloperAccount(),
                spotifyProperties.getRedirectUri(),
                spotifyProperties.getDefaultDeviceId(),
                snapshot.scopes(),
                snapshot.expiresAt(),
                hasConfiguredRefreshToken(),
                mode,
                message
        );
    }

    private SpotifyAuthStatusDto baseStatus(
            boolean enabled,
            boolean authorized,
            LocalDateTime expiresAt,
            String mode,
            String message
    ) {
        return new SpotifyAuthStatusDto(
                enabled,
                authorized,
                spotifyProperties.getDeveloperAccount(),
                spotifyProperties.getRedirectUri(),
                spotifyProperties.getDefaultDeviceId(),
                spotifyProperties.getScopes(),
                expiresAt,
                hasConfiguredRefreshToken(),
                mode,
                message
        );
    }

    private void ensureBridgeConfigured() {
        if (!spotifyProperties.isEnabled()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify bridge mode is disabled.");
        }
        if (!hasClientCredentials()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify Client ID and Client Secret are required.");
        }
        if (isBlank(spotifyProperties.getRedirectUri())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify redirect URI is required.");
        }
    }

    private boolean hasClientCredentials() {
        return !isBlank(spotifyProperties.getClientId()) && !isBlank(spotifyProperties.getClientSecret());
    }

    private boolean hasConfiguredRefreshToken() {
        return !isBlank(spotifyProperties.getBridgeRefreshToken());
    }

    private boolean hasScope(List<String> scopes, String scope) {
        return scopes != null && scopes.stream().anyMatch(scope::equals);
    }

    private List<String> missingScopes(List<String> scopes) {
        return FRONTEND_REQUIRED_SCOPES.stream()
                .filter(scope -> !hasScope(scopes, scope))
                .toList();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void pruneExpiredStates() {
        LocalDateTime now = LocalDateTime.now(clock);
        validStates.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
    }
}
