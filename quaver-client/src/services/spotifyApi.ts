import type { Playlist, Track } from "../types/music";
import { getValidSpotifyAccessToken } from "./spotifyAuth";

function createFallbackArtwork(label: string, start: string, end: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
      <rect width="320" height="320" rx="32" fill="${start}" />
      <circle cx="240" cy="68" r="84" fill="${end}" fill-opacity="0.9" />
      <path d="M112 210V132L208 116V188" stroke="white" stroke-opacity="0.88" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="110" cy="214" r="18" fill="white" fill-opacity="0.92"/>
      <circle cx="206" cy="192" r="18" fill="white" fill-opacity="0.92"/>
      <text x="40" y="284" fill="white" fill-opacity="0.94" font-family="Sora, Arial, sans-serif" font-size="30" font-weight="700">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function inferMood(seed: string) {
  const value = seed
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return ["focus", "chill", "deep", "boost"][value % 4];
}

async function spotifyRequest<T>(path: string, init?: RequestInit) {
  const accessToken = await getValidSpotifyAccessToken();
  if (!accessToken) {
    throw new Error("Missing Spotify access token");
  }

  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) {
    return null as T;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Spotify request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function mapSpotifyTrack(rawTrack: any): Track | null {
  if (!rawTrack?.id) {
    return null;
  }

  const mood = inferMood(`${rawTrack.name}${rawTrack.album?.name ?? ""}`);
  const artwork =
    rawTrack.album?.images?.[0]?.url ||
    createFallbackArtwork(rawTrack.name.slice(0, 2).toUpperCase(), "#1DB954", "#073A1E");

  return {
    id: `spotify-track-${rawTrack.id}`,
    title: rawTrack.name,
    artist: rawTrack.artists?.map((artist: any) => artist.name).join(", ") || "Unknown Artist",
    album: rawTrack.album?.name || "Spotify",
    duration: Math.round((rawTrack.duration_ms ?? 0) / 1000),
    artwork,
    accent: "#1DB954",
    mood,
    genres: [mood, "spotify"],
    source: "spotify",
    spotifyId: rawTrack.id,
    spotifyUri: rawTrack.uri,
    spotifyUrl: rawTrack.external_urls?.spotify,
  };
}

function mapSpotifyPlaylist(rawPlaylist: any): Playlist {
  return {
    id: `spotify-playlist-${rawPlaylist.id}`,
    name: rawPlaylist.name,
    description:
      rawPlaylist.description?.replace(/<[^>]+>/g, "") || "Imported from your Spotify library.",
    cover:
      rawPlaylist.images?.[0]?.url ||
      createFallbackArtwork(rawPlaylist.name.slice(0, 2).toUpperCase(), "#232323", "#121212"),
    accent: "#1DB954",
    tracks: [],
    source: "spotify",
    spotifyId: rawPlaylist.id,
    spotifyUri: rawPlaylist.uri,
    ownerName: rawPlaylist.owner?.display_name || "Spotify",
  };
}

export async function fetchSpotifyProfile() {
  return spotifyRequest<{ display_name?: string }>("/me");
}

export async function fetchSpotifyPlaylists() {
  const response = await spotifyRequest<{ items: any[] }>("/me/playlists?limit=24");
  return response.items.map(mapSpotifyPlaylist);
}

export async function fetchSpotifyPlaylistTracks(playlistId: string) {
  const response = await spotifyRequest<{ items: Array<{ track: any }> }>(
    `/playlists/${playlistId}/tracks?market=from_token&limit=50`,
  );

  return response.items
    .map((item) => mapSpotifyTrack(item.track))
    .filter((track): track is Track => Boolean(track));
}

export async function fetchSpotifyPlaybackState() {
  return spotifyRequest<any>("/me/player");
}

export async function fetchSpotifyQueue() {
  return spotifyRequest<any>("/me/player/queue");
}

export async function startSpotifyPlayback(options: {
  deviceId?: string | null;
  contextUri?: string;
  uris?: string[];
  offsetPosition?: number;
  positionMs?: number;
}) {
  const search = new URLSearchParams();
  if (options.deviceId) {
    search.set("device_id", options.deviceId);
  }

  const body: Record<string, unknown> = {};

  if (options.contextUri) {
    body.context_uri = options.contextUri;
    if (typeof options.offsetPosition === "number") {
      body.offset = { position: options.offsetPosition };
    }
  } else if (options.uris?.length) {
    body.uris = options.uris;
  }

  if (typeof options.positionMs === "number") {
    body.position_ms = options.positionMs;
  }

  await spotifyRequest(`/me/player/play${search.size ? `?${search}` : ""}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function pauseSpotifyPlayback(deviceId?: string | null) {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await spotifyRequest(`/me/player/pause${query}`, {
    method: "PUT",
  });
}

export async function setSpotifyShuffle(enabled: boolean, deviceId?: string | null) {
  const query = new URLSearchParams({ state: enabled ? "true" : "false" });
  if (deviceId) {
    query.set("device_id", deviceId);
  }

  await spotifyRequest(`/me/player/shuffle?${query.toString()}`, {
    method: "PUT",
  });
}

export async function setSpotifyRepeatMode(
  state: "track" | "context" | "off",
  deviceId?: string | null,
) {
  const query = new URLSearchParams({ state });
  if (deviceId) {
    query.set("device_id", deviceId);
  }

  await spotifyRequest(`/me/player/repeat?${query.toString()}`, {
    method: "PUT",
  });
}

export async function addTrackToSpotifyQueue(uri: string, deviceId?: string | null) {
  const query = new URLSearchParams({ uri });
  if (deviceId) {
    query.set("device_id", deviceId);
  }

  await spotifyRequest(`/me/player/queue?${query.toString()}`, {
    method: "POST",
  });
}

export async function addTracksToSpotifyPlaylist(playlistId: string, uris: string[]) {
  await spotifyRequest(`/playlists/${playlistId}/tracks`, {
    method: "POST",
    body: JSON.stringify({ uris }),
  });
}

export async function transferSpotifyPlayback(deviceId: string, shouldPlay = false) {
  await spotifyRequest("/me/player", {
    method: "PUT",
    body: JSON.stringify({
      device_ids: [deviceId],
      play: shouldPlay,
    }),
  });
}

export { mapSpotifyTrack };
