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
public class SpotifyPlayerTokenDto {

    private String accessToken;

    private LocalDateTime expiresAt;

    private List<String> scopes;
}
