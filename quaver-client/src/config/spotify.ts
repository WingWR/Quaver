const defaultScopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
];

const scopeEnv = import.meta.env.VITE_SPOTIFY_SCOPES;

export const spotifyConfig = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim() ?? "",
  redirectUri:
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim() ??
    (typeof window !== "undefined" ? window.location.origin : ""),
  playerName: import.meta.env.VITE_SPOTIFY_PLAYER_NAME?.trim() || "Quaver Web Player",
  scopes: scopeEnv
    ? scopeEnv
        .split(",")
        .map((scope) => scope.trim())
        .filter(Boolean)
    : defaultScopes,
};

export function isSpotifyConfigured() {
  return Boolean(spotifyConfig.clientId && spotifyConfig.redirectUri);
}

// Spotify recommends PKCE for browser apps. Keep the client secret off the client.
export const spotifyDeveloperConfig = {
  clientId: spotifyConfig.clientId,
  redirectUri: spotifyConfig.redirectUri,
  scopes: spotifyConfig.scopes,
  playerName: spotifyConfig.playerName,
};
