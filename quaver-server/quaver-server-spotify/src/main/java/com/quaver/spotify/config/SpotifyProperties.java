package com.quaver.spotify.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quaver.spotify")
public class SpotifyProperties {

    private boolean enabled;
    private String clientId = "";
    private String clientSecret = "";
    private String redirectUri = "http://localhost:8080/api/spotify/auth/callback";
    private String developerAccount = "";
    private String defaultDeviceId = "";
    private List<String> scopes = new ArrayList<>(List.of(
            "user-read-private",
            "user-read-email",
            "user-read-playback-state",
            "user-read-currently-playing",
            "user-modify-playback-state",
            "playlist-read-private",
            "playlist-modify-private",
            "playlist-modify-public"
    ));

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public String getDeveloperAccount() {
        return developerAccount;
    }

    public void setDeveloperAccount(String developerAccount) {
        this.developerAccount = developerAccount;
    }

    public String getDefaultDeviceId() {
        return defaultDeviceId;
    }

    public void setDefaultDeviceId(String defaultDeviceId) {
        this.defaultDeviceId = defaultDeviceId;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public void setScopes(List<String> scopes) {
        this.scopes = scopes;
    }
}
