declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (config: {
        name: string;
        volume?: number;
        getOAuthToken: (callback: (token: string) => void) => void;
        enableMediaSession?: boolean;
      }) => SpotifyPlayerInstance;
    };
  }
  interface SpotifyPlayerInstance {
    addListener(
      event:
        | "ready"
        | "not_ready"
        | "initialization_error"
        | "authentication_error"
        | "account_error"
        | "playback_error"
        | "player_state_changed",
      callback: (payload: any) => void,
    ): boolean;
    connect(): Promise<boolean>;
    disconnect(): void;
    togglePlay(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    activateElement?(): Promise<void>;
  }
}

export {};
