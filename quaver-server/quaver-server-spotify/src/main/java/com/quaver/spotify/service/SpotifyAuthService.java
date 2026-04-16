package com.quaver.spotify.service;

import com.quaver.spotify.dto.SpotifyAuthStatusDto;
import java.net.URI;
import java.util.Optional;

public interface SpotifyAuthService {

    URI buildAuthorizationUri();

    SpotifyAuthStatusDto handleAuthorizationCallback(String code, String state);

    SpotifyAuthStatusDto getCurrentStatus();

    Optional<String> getValidAccessToken();
}
