export type MusicSource = "backend" | "spotify";
export type PlaybackSource = MusicSource;
export type CanvasView = "browse" | "lyrics";
export type WorkspaceView = "library" | "agent";
export type RepeatMode = "off" | "context" | "track";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  accent: string;
  mood: string;
  genres: string[];
  source?: MusicSource;
  spotifyId?: string;
  spotifyUri?: string;
  spotifyUrl?: string;
  lyrics?: LyricLine[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  accent: string;
  tracks: Track[];
  source?: MusicSource;
  spotifyId?: string;
  spotifyUri?: string;
  ownerName?: string;
}

export interface AgentResponse {
  type: "playlist" | "search" | "system";
  title: string;
  summary: string;
  tracks: Track[];
}

export interface LyricLine {
  id: string;
  timestamp: number;
  text: string;
}
