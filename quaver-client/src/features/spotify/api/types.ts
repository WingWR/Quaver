import type { PlaybackSource, Playlist, RepeatMode, Track } from "../../../types/music";

export interface SpotifyAuthStatus {
  enabled: boolean;
  authorized: boolean;
  developerAccount?: string;
  redirectUri?: string;
  defaultDeviceId?: string;
  scopes?: string[];
  expiresAt?: string;
  refreshTokenConfigured?: boolean;
  connectionMode?: string;
  message?: string;
}

export interface SpotifyProfile {
  displayName?: string;
  email?: string;
  imageUrl?: string;
}

export interface SpotifyPlaybackState {
  queue: Track[];
  currentTrackIndex: number;
  isPlaying?: boolean;
  progress?: number;
  volume?: number;
  playbackSource?: PlaybackSource;
  isShuffleEnabled?: boolean;
  repeatMode?: RepeatMode;
}

export interface SpotifyPlaybackOptions {
  trackId?: string;
  spotifyUri?: string;
  deviceId?: string | null;
  uris?: string[];
  contextUri?: string;
  offsetPosition?: number;
  positionMs?: number;
}

export interface SpotifyBridgeRedirectResult {
  status: "connected" | "error" | null;
  error: string | null;
}

export type SpotifyPlaylist = Playlist;
