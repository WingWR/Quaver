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
  source?: "mock" | "spotify";
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
  source?: "mock" | "spotify";
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
