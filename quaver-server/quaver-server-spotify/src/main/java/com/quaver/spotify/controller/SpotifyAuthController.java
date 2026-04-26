package com.quaver.spotify.controller;

import com.quaver.common.config.QuaverFrontendProperties;
import com.quaver.spotify.dto.SpotifyAuthStatusDto;
import com.quaver.spotify.service.SpotifyAuthService;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
@RequestMapping("/spotify/auth")
public class SpotifyAuthController {

    private final SpotifyAuthService spotifyAuthService;
    private final QuaverFrontendProperties frontendProperties;

    public SpotifyAuthController(SpotifyAuthService spotifyAuthService, QuaverFrontendProperties frontendProperties) {
        this.spotifyAuthService = spotifyAuthService;
        this.frontendProperties = frontendProperties;
    }

    @GetMapping("/login")
    public ResponseEntity<Void> login() {
        try {
            URI location = spotifyAuthService.buildAuthorizationUri();
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, location.toString())
                    .build();
        } catch (RuntimeException exception) {
            return redirectToFrontend("error", safeErrorMessage(exception));
        }
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam(required = false) String code,
                                         @RequestParam(required = false) String state,
                                         @RequestParam(required = false) String error) {
        if (error != null && !error.isBlank()) {
            return redirectToFrontend("error", error);
        }
        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            return redirectToFrontend("error", "missing_authorization_code");
        }

        try {
            spotifyAuthService.handleAuthorizationCallback(code, state);
            return redirectToFrontend("connected", null);
        } catch (RuntimeException exception) {
            return redirectToFrontend("error", safeErrorMessage(exception));
        }
    }

    @GetMapping("/status")
    public SpotifyAuthStatusDto status() {
        return spotifyAuthService.getCurrentStatus();
    }

    private ResponseEntity<Void> redirectToFrontend(String status, String error) {
        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(frontendProperties.getBaseUrl())
                .queryParam("spotifyBridge", status);
        if (error != null && !error.isBlank()) {
            builder.queryParam("spotifyError", error);
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, builder.build().encode().toUriString())
                .build();
    }

    private String safeErrorMessage(RuntimeException exception) {
        if (exception.getMessage() == null || exception.getMessage().isBlank()) {
            return "spotify_authorization_failed";
        }
        return exception.getMessage();
    }
}
