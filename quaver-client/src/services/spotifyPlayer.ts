import { spotifyConfig } from "../config/spotify";
import { getValidSpotifyAccessToken } from "./spotifyAuth";

let player: SpotifyPlayerInstance | null = null;
let sdkLoader: Promise<void> | null = null;

function loadSpotifySdk() {
  if (sdkLoader) {
    return sdkLoader;
  }

  sdkLoader = new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Spotify Web Playback SDK"));
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    document.body.appendChild(script);
  });

  return sdkLoader;
}

export async function initializeSpotifyPlayer(options: {
  initialVolume: number;
  onReady: (deviceId: string) => void;
  onOffline: (deviceId: string) => void;
  onStateChange: (state: any) => void;
  onError: (message: string) => void;
}) {
  if (player) {
    return player;
  }

  await loadSpotifySdk();

  player = new window.Spotify!.Player({
    name: spotifyConfig.playerName,
    volume: options.initialVolume,
    enableMediaSession: true,
    getOAuthToken: async (callback) => {
      const accessToken = await getValidSpotifyAccessToken();
      callback(accessToken ?? "");
    },
  });

  player.addListener("ready", ({ device_id }: { device_id: string }) => {
    options.onReady(device_id);
  });

  player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
    options.onOffline(device_id);
  });

  player.addListener("player_state_changed", (state: any) => {
    if (state) {
      options.onStateChange(state);
    }
  });

  player.addListener("initialization_error", ({ message }: { message: string }) => {
    options.onError(message);
  });
  player.addListener("authentication_error", ({ message }: { message: string }) => {
    options.onError(message);
  });
  player.addListener("account_error", ({ message }: { message: string }) => {
    options.onError(message);
  });
  player.addListener("playback_error", ({ message }: { message: string }) => {
    options.onError(message);
  });

  await player.connect();
  return player;
}

export function getSpotifyPlayer() {
  return player;
}

export function destroySpotifyPlayer() {
  player?.disconnect();
  player = null;
}
