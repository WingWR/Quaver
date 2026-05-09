import type { PlaybackSource, Playlist, RepeatMode, Track } from "../../../types/music";

export interface BackendPlaybackState {
  queue: Track[];
  currentTrackIndex: number;
  isPlaying?: boolean;
  progress?: number;
  volume?: number;
  playbackSource?: PlaybackSource;
  isShuffleEnabled?: boolean;
  repeatMode?: RepeatMode;
}

export interface LibraryBootstrapResponse {
  playlists: Playlist[];
  selectedPlaylistId?: string;
  playback?: BackendPlaybackState;
  serverTime?: string;
}

export interface QueueMutationRequest {
  trackId: string;
}

export interface PlaylistTrackMutationRequest {
  trackId: string;
}

export interface PlaylistCreateRequest {
  name?: string;
  description?: string;
}

export interface PlaylistUpdateRequest {
  name?: string;
  description?: string;
}

export interface PlaybackStartRequest {
  tracks: Track[];
  startIndex?: number;
  playbackSource?: PlaybackSource;
}

export interface PlaybackStateUpdateRequest {
  queue?: Track[];
  currentTrackIndex?: number;
  isPlaying?: boolean;
  progress?: number;
  volume?: number;
  playbackSource?: PlaybackSource;
  isShuffleEnabled?: boolean;
  repeatMode?: RepeatMode;
}

export interface LibraryMutationResponse {
  success: boolean;
  message?: string;
  playback?: BackendPlaybackState;
  playlists?: Playlist[];
  selectedPlaylistId?: string;
}
