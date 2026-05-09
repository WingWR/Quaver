import { startTransition, useEffect } from "react";
import { formatBackendError } from "../api/http";
import {
  consumeSpotifyBridgeRedirect,
  fetchSpotifyAuthStatus,
} from "../features/spotify/api/client";
import { useQuaverStore } from "../store/useQuaverStore";

const SPOTIFY_UNAVAILABLE_MESSAGE =
  "Spotify bridge is not ready. Connect Spotify after the backend is running.";
const REQUIRED_SPOTIFY_SCOPES = ["streaming", "playlist-read-collaborative"];

function parseSpotifyError(error: unknown) {
  const message = formatBackendError(error, SPOTIFY_UNAVAILABLE_MESSAGE);

  if (message.includes("PREMIUM_REQUIRED")) {
    return {
      message: "Spotify playback requires a Premium account.",
      requiresPremium: true,
    };
  }

  return {
    message,
    requiresPremium: false,
  };
}

export function useSpotifyBootstrap() {
  const setSpotifyState = useQuaverStore((state) => state.setSpotifyState);

  useEffect(() => {
    const controller = new AbortController();
    const redirectResult = consumeSpotifyBridgeRedirect();

    async function bootstrapSpotify() {
      if (redirectResult.status === "error") {
        setSpotifyState({
          error: redirectResult.error ?? "Spotify authorization failed.",
          isAuthenticated: false,
        });
      }

      try {
        const status = await fetchSpotifyAuthStatus(controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        const missingScopes = REQUIRED_SPOTIFY_SCOPES.filter(
          (scope) => !(status.scopes ?? []).includes(scope),
        );

        setSpotifyState({
          isConfigured: status.enabled,
          isAuthenticated: status.authorized,
          deviceId: null,
          playerReady: false,
          playerError: null,
          userName: status.developerAccount || null,
          scopes: status.scopes ?? [],
          error: status.authorized && missingScopes.length
            ? `Spotify is connected, but it needs a fresh authorization with: ${missingScopes.join(", ")}.`
            : redirectResult.status === "connected"
              ? null
              : redirectResult.error ?? (status.authorized ? null : status.message ?? null),
          requiresPremium: false,
        });

        if (!status.enabled || !status.authorized) {
          return;
        }

        startTransition(() => {
          setSpotifyState({
            userName: status.developerAccount ?? "Spotify bridge",
            error: missingScopes.length
              ? `Spotify is connected, but it needs a fresh authorization with: ${missingScopes.join(", ")}.`
              : null,
          });
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const parsed = parseSpotifyError(error);
        setSpotifyState({
          isConfigured: false,
          isAuthenticated: false,
          deviceId: null,
          playerReady: false,
          error: parsed.message,
          playerError: null,
          requiresPremium: parsed.requiresPremium,
          scopes: [],
        });
      }
    }

    bootstrapSpotify();

    return () => controller.abort();
  }, [setSpotifyState]);
}
