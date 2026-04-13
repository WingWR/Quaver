import { appConfig } from "./app";

export const spotifyConfig = {
  clientId: appConfig.spotify.clientId,
  redirectUri: appConfig.spotify.redirectUri,
  playerName: appConfig.spotify.playerName,
  scopes: appConfig.spotify.scopes,
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
  developerAccount: appConfig.spotify.developerAccount,
};
