import { backendRequest, resolveBackendUrl } from "../../../api/http";
import type {
  SpotifyAuthStatus,
  SpotifyBridgeRedirectResult,
  SpotifyPlaybackOptions,
  SpotifyPlaybackState,
  SpotifyPlaylist,
  SpotifyProfile,
} from "./types";

const SPOTIFY_BASE_PATH = "/spotify";

export function beginSpotifyBridgeAuthorization() {
  window.location.assign(resolveBackendUrl(`${SPOTIFY_BASE_PATH}/auth/login`));
}

export function consumeSpotifyBridgeRedirect(): SpotifyBridgeRedirectResult {
  const url = new URL(window.location.href);
  const status = url.searchParams.get("spotifyBridge");
  const error = url.searchParams.get("spotifyError");

  if (!status && !error) {
    return { status: null, error: null };
  }

  url.searchParams.delete("spotifyBridge");
  url.searchParams.delete("spotifyError");
  window.history.replaceState({}, "", url);

  return {
    status: status === "connected" ? "connected" : status === "error" ? "error" : null,
    error,
  };
}

export function fetchSpotifyAuthStatus(signal?: AbortSignal) {
  return backendRequest<SpotifyAuthStatus>(`${SPOTIFY_BASE_PATH}/auth/status`, { signal });
}

export function fetchSpotifyProfile(signal?: AbortSignal) {
  return backendRequest<SpotifyProfile>(`${SPOTIFY_BASE_PATH}/me/profile`, { signal });
}

export function fetchSpotifyPlaylists(signal?: AbortSignal) {
  return backendRequest<SpotifyPlaylist[]>(`${SPOTIFY_BASE_PATH}/me/playlists`, { signal });
}

export function fetchSpotifyPlaylistTracks(playlistId: string, signal?: AbortSignal) {
  return backendRequest<SpotifyPlaybackState["queue"]>(
    `${SPOTIFY_BASE_PATH}/playlists/${encodeURIComponent(playlistId)}/tracks`,
    { signal },
  );
}

export function fetchSpotifyPlaybackState(signal?: AbortSignal) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/state`, {
    signal,
  });
}

export function startSpotifyPlayback(options: SpotifyPlaybackOptions) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/play`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export function pauseSpotifyPlayback(deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/pause`, {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
}

export function skipToNextSpotifyTrack(deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/next`, {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
}

export function skipToPreviousSpotifyTrack(deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/previous`, {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
}

export function seekSpotifyPlayback(positionMs: number, deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/seek`, {
    method: "POST",
    body: JSON.stringify({ positionMs, deviceId }),
  });
}

export function setSpotifyShuffle(enabled: boolean, deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/shuffle`, {
    method: "POST",
    body: JSON.stringify({ enabled, deviceId }),
  });
}

export function setSpotifyRepeatMode(
  mode: "track" | "context" | "off",
  deviceId?: string | null,
) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/repeat`, {
    method: "POST",
    body: JSON.stringify({ mode, deviceId }),
  });
}

export function setSpotifyVolume(volume: number, deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/volume`, {
    method: "POST",
    body: JSON.stringify({ volume, deviceId }),
  });
}

export function addTrackToSpotifyQueue(spotifyUri: string, deviceId?: string | null) {
  return backendRequest<SpotifyPlaybackState>(`${SPOTIFY_BASE_PATH}/playback/queue`, {
    method: "POST",
    body: JSON.stringify({ spotifyUri, deviceId }),
  });
}

export function addTracksToSpotifyPlaylist(playlistId: string, uris: string[]) {
  return backendRequest<void>(
    `${SPOTIFY_BASE_PATH}/playback/playlists/${encodeURIComponent(playlistId)}/tracks`,
    {
      method: "POST",
      body: JSON.stringify({ uris }),
    },
  );
}
