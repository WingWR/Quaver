import { startTransition, useEffect } from "react";
import { formatBackendError } from "../api/http";
import {
  consumeSpotifyBridgeRedirect,
  fetchSpotifyAuthStatus,
  fetchSpotifyPlaybackState,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyPlaylists,
  fetchSpotifyProfile,
} from "../features/spotify/api/client";
import { useQuaverStore } from "../store/useQuaverStore";

const SPOTIFY_UNAVAILABLE_MESSAGE =
  "Spotify bridge is not ready. Connect Spotify after the backend is running.";

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

async function syncSpotifyPlaybackState() {
  const { syncPlayback, setSpotifyState } = useQuaverStore.getState();

  try {
    const playback = await fetchSpotifyPlaybackState();
    syncPlayback(playback);
    setSpotifyState({
      error: null,
      requiresPremium: false,
    });
  } catch (error) {
    const parsed = parseSpotifyError(error);
    setSpotifyState({
      error: parsed.message,
      requiresPremium: parsed.requiresPremium,
    });
  }
}

export function useSpotifyBootstrap() {
  const playlists = useQuaverStore((state) => state.playlists);
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const spotify = useQuaverStore((state) => state.spotify);
  const replacePlaylistsBySource = useQuaverStore((state) => state.replacePlaylistsBySource);
  const updatePlaylistTracks = useQuaverStore((state) => state.updatePlaylistTracks);
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

        setSpotifyState({
          isConfigured: status.enabled,
          isAuthenticated: status.authorized,
          deviceId: null,
          userName: status.developerAccount || null,
          error:
            redirectResult.status === "connected"
              ? null
              : redirectResult.error ?? (status.authorized ? null : status.message ?? null),
          requiresPremium: false,
        });

        if (!status.enabled || !status.authorized) {
          replacePlaylistsBySource("spotify", []);
          return;
        }

        const [profile, spotifyPlaylists] = await Promise.all([
          fetchSpotifyProfile(controller.signal),
          fetchSpotifyPlaylists(controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setSpotifyState({
            userName: profile.displayName ?? status.developerAccount ?? "Spotify listener",
            error: null,
          });
          replacePlaylistsBySource("spotify", spotifyPlaylists);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const parsed = parseSpotifyError(error);
        setSpotifyState({
          isConfigured: false,
          isAuthenticated: false,
          error: parsed.message,
          requiresPremium: parsed.requiresPremium,
        });
      }
    }

    bootstrapSpotify();

    return () => controller.abort();
  }, [replacePlaylistsBySource, setSpotifyState]);

  useEffect(() => {
    const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);

    if (
      !selectedPlaylist ||
      !selectedPlaylist.spotifyId ||
      selectedPlaylist.tracks.length > 0 ||
      !spotify.isAuthenticated
    ) {
      return;
    }

    const controller = new AbortController();
    const playlistId = selectedPlaylist.id;
    const spotifyPlaylistId = selectedPlaylist.spotifyId;

    async function loadPlaylistTracks() {
      try {
        const tracks = await fetchSpotifyPlaylistTracks(
          spotifyPlaylistId,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          updatePlaylistTracks(playlistId, tracks);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const parsed = parseSpotifyError(error);
          setSpotifyState({ error: parsed.message });
        }
      }
    }

    loadPlaylistTracks();

    return () => controller.abort();
  }, [
    playlists,
    selectedPlaylistId,
    setSpotifyState,
    spotify.isAuthenticated,
    updatePlaylistTracks,
  ]);

  useEffect(() => {
    if (!spotify.isAuthenticated) {
      return;
    }

    const timer = window.setInterval(() => {
      syncSpotifyPlaybackState();
    }, 15000);

    syncSpotifyPlaybackState();

    return () => window.clearInterval(timer);
  }, [spotify.isAuthenticated]);
}
