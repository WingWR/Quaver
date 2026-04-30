/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_BACKEND_TIMEOUT_MS?: string;
  readonly VITE_AGENT_DEFAULT_CONVERSATION_TITLE?: string;
  readonly VITE_SPOTIFY_DEVELOPER_ACCOUNT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  Spotify?: {
    Player: typeof Spotify.Player;
  };
  onSpotifyWebPlaybackSDKReady?: () => void;
}

namespace Spotify {
  interface WebPlaybackPlayer {
    device_id: string;
  }

  interface WebPlaybackImage {
    url: string;
  }

  interface WebPlaybackArtist {
    name: string;
  }

  interface WebPlaybackAlbum {
    name?: string;
    images?: WebPlaybackImage[];
  }

  interface WebPlaybackTrack {
    id?: string;
    uri?: string;
    name?: string;
    duration_ms?: number;
    album?: WebPlaybackAlbum;
    artists?: WebPlaybackArtist[];
  }

  interface WebPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track?: WebPlaybackTrack;
    };
  }

  interface WebPlaybackError {
    message: string;
  }

  type ErrorListener = (error: WebPlaybackError) => void;

  class Player {
    constructor(options: {
      name: string;
      getOAuthToken: (callback: (token: string) => void) => void;
      volume?: number;
    });

    addListener(event: "ready" | "not_ready", listener: (player: WebPlaybackPlayer) => void): boolean;
    addListener(event: "player_state_changed", listener: (state: WebPlaybackState | null) => void): boolean;
    addListener(
      event: "initialization_error" | "authentication_error" | "account_error" | "playback_error",
      listener: ErrorListener,
    ): boolean;
    addListener(event: "autoplay_failed", listener: () => void): boolean;
    connect(): Promise<boolean>;
    disconnect(): void;
    activateElement(): Promise<void>;
    setVolume(volume: number): Promise<void>;
  }
}
