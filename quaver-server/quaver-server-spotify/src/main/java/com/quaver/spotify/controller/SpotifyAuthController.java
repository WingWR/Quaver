package com.quaver.spotify.controller;

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

@RestController
@RequestMapping("/spotify/auth")
public class SpotifyAuthController {

    private final SpotifyAuthService spotifyAuthService;

    public SpotifyAuthController(SpotifyAuthService spotifyAuthService) {
        this.spotifyAuthService = spotifyAuthService;
    }

    @GetMapping("/login")
    public ResponseEntity<Void> login() {
        URI location = spotifyAuthService.buildAuthorizationUri();
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, location.toString())
                .build();
    }

    @GetMapping("/callback")
    public SpotifyAuthStatusDto callback(@RequestParam String code, @RequestParam String state) {
        return spotifyAuthService.handleAuthorizationCallback(code, state);
    }

    @GetMapping("/status")
    public SpotifyAuthStatusDto status() {
        return spotifyAuthService.getCurrentStatus();
    }
}
