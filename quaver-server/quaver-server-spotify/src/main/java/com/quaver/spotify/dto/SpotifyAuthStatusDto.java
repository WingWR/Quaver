package com.quaver.spotify.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpotifyAuthStatusDto {

    private boolean enabled;

    private boolean authorized;

    private String developerAccount;

    private String redirectUri;

    private String defaultDeviceId;

    private List<String> scopes;

    private LocalDateTime expiresAt;

    private boolean refreshTokenConfigured;

    private String connectionMode;

    private String message;
}
