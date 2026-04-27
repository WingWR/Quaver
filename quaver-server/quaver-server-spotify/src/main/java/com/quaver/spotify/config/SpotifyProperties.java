package com.quaver.spotify.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quaver.spotify")
public class SpotifyProperties {

    private boolean enabled;
    private String clientId = "";
    private String clientSecret = "";
    private String redirectUri = "http://127.0.0.1:8080/api/spotify/auth/callback";
    private String developerAccount = "";
    private String defaultDeviceId = "";
    private String bridgeRefreshToken = "";
    private String searchMarket = "US";
    private List<String> scopes = new ArrayList<>(List.of(
            "user-read-private",
            "user-read-email",
            "user-read-playback-state",
            "user-read-currently-playing",
            "user-modify-playback-state",
            "streaming",
            "playlist-read-private",
            "playlist-read-collaborative",
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

    public String getBridgeRefreshToken() {
        return bridgeRefreshToken;
    }

    public void setBridgeRefreshToken(String bridgeRefreshToken) {
        this.bridgeRefreshToken = bridgeRefreshToken;
    }

    public String getSearchMarket() {
        return searchMarket;
    }

    public void setSearchMarket(String searchMarket) {
        this.searchMarket = searchMarket;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public void setScopes(List<String> scopes) {
        this.scopes = scopes;
    }
}
