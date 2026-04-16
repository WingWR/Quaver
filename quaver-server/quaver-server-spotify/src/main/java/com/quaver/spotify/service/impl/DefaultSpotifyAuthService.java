package com.quaver.spotify.service.impl;

import com.quaver.common.exception.BusinessException;
import com.quaver.spotify.client.SpotifyAuthClient;
import com.quaver.spotify.config.SpotifyProperties;
import com.quaver.spotify.dto.SpotifyAuthStatusDto;
import com.quaver.spotify.entity.SpotifyAuthorizationEntity;
import com.quaver.spotify.mapper.SpotifyAuthorizationMapper;
import com.quaver.spotify.model.SpotifyTokenSnapshot;
import com.quaver.spotify.service.SpotifyAuthService;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultSpotifyAuthService implements SpotifyAuthService {

    private static final String BRIDGE_ID = "bridge-default";

    private final SpotifyAuthClient spotifyAuthClient;
    private final SpotifyAuthorizationMapper authorizationMapper;
    private final SpotifyProperties spotifyProperties;
    private final Clock clock;
    private final Map<String, LocalDateTime> validStates = new HashMap<>();

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
        ensureEnabled();
        String state = UUID.randomUUID().toString();
        validStates.put(state, LocalDateTime.now(clock).plusMinutes(10));
        return spotifyAuthClient.buildAuthorizationUri(state);
    }

    @Override
    @Transactional
    public SpotifyAuthStatusDto handleAuthorizationCallback(String code, String state) {
        ensureEnabled();
        LocalDateTime expiresAt = validStates.remove(state);
        if (state == null || expiresAt == null || expiresAt.isBefore(LocalDateTime.now(clock))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify authorization state is invalid or expired.");
        }

        SpotifyTokenSnapshot snapshot = spotifyAuthClient.exchangeAuthorizationCode(code);
        saveSnapshot(snapshot);
        return toStatus(snapshot);
    }

    @Override
    public SpotifyAuthStatusDto getCurrentStatus() {
        if (!spotifyProperties.isEnabled()) {
            return new SpotifyAuthStatusDto(false, false, spotifyProperties.getDeveloperAccount(),
                    spotifyProperties.getRedirectUri(), spotifyProperties.getScopes(), null);
        }

        SpotifyAuthorizationEntity entity = authorizationMapper.selectById(BRIDGE_ID);
        if (entity == null) {
            return new SpotifyAuthStatusDto(true, false, spotifyProperties.getDeveloperAccount(),
                    spotifyProperties.getRedirectUri(), spotifyProperties.getScopes(), null);
        }

        return new SpotifyAuthStatusDto(
                true,
                true,
                entity.getDeveloperAccount(),
                spotifyProperties.getRedirectUri(),
                entity.getScopes(),
                entity.getExpiresAt()
        );
    }

    @Override
    @Transactional
    public Optional<String> getValidAccessToken() {
        if (!spotifyProperties.isEnabled()) {
            return Optional.empty();
        }

        SpotifyAuthorizationEntity entity = authorizationMapper.selectById(BRIDGE_ID);
        if (entity == null) {
            return Optional.empty();
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

    private SpotifyAuthStatusDto toStatus(SpotifyTokenSnapshot snapshot) {
        return new SpotifyAuthStatusDto(
                spotifyProperties.isEnabled(),
                true,
                spotifyProperties.getDeveloperAccount(),
                spotifyProperties.getRedirectUri(),
                snapshot.scopes(),
                snapshot.expiresAt()
        );
    }

    private void ensureEnabled() {
        if (!spotifyProperties.isEnabled()) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Spotify bridge mode is disabled.");
        }
    }
}
