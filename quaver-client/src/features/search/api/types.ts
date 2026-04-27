import type { Track } from "../../../types/music";

export interface AgentTrackSearchRequest {
  query: string;
  model?: string;
  limit?: number;
  offset?: number;
  selectedPlaylistId?: string;
  playlistIds?: string[];
  queueTrackIds?: string[];
  spotifyDeveloperAccount?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentTrackSearchResponse {
  query: string;
  tracks: Track[];
  total: number;
  limit?: number;
  offset?: number;
  hasMore?: boolean;
  model?: string;
  requestId?: string;
  status: "ready" | "empty" | "error";
  tookMs?: number;
  message?: string;
}
