import { useEffect, useMemo, useRef } from "react";
import { formatBackendError } from "../api/http";
import { fetchSpotifyPlayerToken } from "../features/spotify/api/client";
import type { SpotifyPlayerToken } from "../features/spotify/api/types";
import { useQuaverStore } from "../store/useQuaverStore";

const SPOTIFY_SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const SPOTIFY_STREAMING_SCOPE = "streaming";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

let spotifySdkPromise: Promise<void> | null = null;
let activePlayer: Spotify.Player | null = null;

function loadSpotifySdk() {
  if (window.Spotify?.Player) {
    return Promise.resolve();
  }

  if (spotifySdkPromise) {
    return spotifySdkPromise;
  }

  spotifySdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SPOTIFY_SDK_URL}"]`,
    );
    const previousReadyHandler = window.onSpotifyWebPlaybackSDKReady;

    window.onSpotifyWebPlaybackSDKReady = () => {
      previousReadyHandler?.();
      resolve();
    };

    if (existingScript) {
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Spotify Web Playback SDK failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SPOTIFY_SDK_URL;
    script.async = true;
    script.addEventListener(
      "error",
      () => reject(new Error("Spotify Web Playback SDK failed to load.")),
      { once: true },
    );
    document.body.appendChild(script);
  });

  return spotifySdkPromise;
}

function isTokenFresh(token: SpotifyPlayerToken | null): token is SpotifyPlayerToken {
  if (!token?.accessToken || !token.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(token.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt - Date.now() > TOKEN_REFRESH_BUFFER_MS;
}

function asPlaybackErrorMessage(error: Spotify.WebPlaybackError) {
  return error.message || "Spotify Web Playback SDK reported an error.";
}

export function useSpotifyWebPlaybackSdk() {
  const spotify = useQuaverStore((state) => state.spotify);
  const volume = useQuaverStore((state) => state.volume);
  const setSpotifyState = useQuaverStore((state) => state.setSpotifyState);
  const cachedTokenRef = useRef<SpotifyPlayerToken | null>(null);
  const scopesKey = useMemo(() => spotify.scopes.join(" "), [spotify.scopes]);
  const hasStreamingScope = spotify.scopes.includes(SPOTIFY_STREAMING_SCOPE);

  useEffect(() => {
    if (!spotify.isAuthenticated) {
      setSpotifyState({
        deviceId: null,
        playerReady: false,
        playerError: null,
      });
      return;
    }

    if (scopesKey && !hasStreamingScope) {
      setSpotifyState({
        deviceId: null,
        playerReady: false,
        playerError:
          "Spotify browser playback needs the streaming scope. Connect Spotify again.",
      });
      return;
    }

    let isMounted = true;
    let player: Spotify.Player | null = null;

    async function getPlayerToken() {
      const cachedToken = cachedTokenRef.current;
      if (isTokenFresh(cachedToken)) {
        return cachedToken.accessToken;
      }

      const token = await fetchSpotifyPlayerToken();
      cachedTokenRef.current = token;
      setSpotifyState({
        scopes: token.scopes ?? [],
        playerError: null,
      });
      return token.accessToken;
    }

    function handleSdkError(error: Spotify.WebPlaybackError) {
      if (!isMounted) {
        return;
      }

      setSpotifyState({
        playerReady: false,
        playerError: asPlaybackErrorMessage(error),
      });
    }

    async function connectPlayer() {
      setSpotifyState({
        playerReady: false,
        playerError: null,
      });

      try {
        await loadSpotifySdk();
        if (!isMounted || !window.Spotify?.Player) {
          return;
        }

        player = new window.Spotify.Player({
          name: "Quaver Web Player",
          volume: Math.max(0, Math.min(1, useQuaverStore.getState().volume / 100)),
          getOAuthToken: (callback) => {
            void getPlayerToken()
              .then((token) => callback(token))
              .catch((error) => {
                if (!isMounted) {
                  return;
                }

                setSpotifyState({
                  playerReady: false,
                  playerError: formatBackendError(
                    error,
                    "Spotify browser player could not get an access token.",
                  ),
                });
              });
          },
        });

        activePlayer = player;
        player.addListener("ready", ({ device_id }) => {
          if (!isMounted) {
            return;
          }

          setSpotifyState({
            deviceId: device_id,
            playerReady: true,
            playerError: null,
          });
        });
        player.addListener("not_ready", ({ device_id }) => {
          if (!isMounted) {
            return;
          }

          const currentDeviceId = useQuaverStore.getState().spotify.deviceId;
          setSpotifyState({
            deviceId: currentDeviceId === device_id ? null : currentDeviceId,
            playerReady: false,
            playerError: "Spotify browser player is not ready yet.",
          });
        });
        player.addListener("initialization_error", handleSdkError);
        player.addListener("authentication_error", handleSdkError);
        player.addListener("playback_error", handleSdkError);
        player.addListener("account_error", (error) => {
          if (!isMounted) {
            return;
          }

          setSpotifyState({
            playerReady: false,
            playerError: asPlaybackErrorMessage(error),
            requiresPremium: true,
          });
        });
        player.addListener("autoplay_failed", () => {
          if (!isMounted) {
            return;
          }

          setSpotifyState({
            playerError: "Browser autoplay was blocked. Click play again to start Spotify.",
          });
        });

        const connected = await player.connect();
        if (!connected && isMounted) {
          setSpotifyState({
            playerReady: false,
            playerError: "Spotify browser player could not connect.",
          });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSpotifyState({
          playerReady: false,
          playerError: formatBackendError(
            error,
            "Spotify browser player could not be initialized.",
          ),
        });
      }
    }

    function activatePlayerElement() {
      void activePlayer?.activateElement();
    }

    window.addEventListener("pointerdown", activatePlayerElement, { capture: true });
    void connectPlayer();

    return () => {
      isMounted = false;
      window.removeEventListener("pointerdown", activatePlayerElement, {
        capture: true,
      });

      if (player) {
        player.disconnect();
      }

      if (activePlayer === player) {
        activePlayer = null;
      }

      setSpotifyState({
        deviceId: null,
        playerReady: false,
      });
    };
  }, [hasStreamingScope, scopesKey, setSpotifyState, spotify.isAuthenticated]);

  useEffect(() => {
    if (!spotify.playerReady || !activePlayer) {
      return;
    }

    void activePlayer.setVolume(Math.max(0, Math.min(1, volume / 100)));
  }, [spotify.playerReady, volume]);
}
