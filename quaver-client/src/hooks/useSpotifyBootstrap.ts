import { startTransition, useEffect } from "react";
import { isSpotifyConfigured } from "../config/spotify";
import { useQuaverStore } from "../store/useQuaverStore";
import {
  fetchSpotifyPlaybackState,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyPlaylists,
  fetchSpotifyProfile,
  fetchSpotifyQueue,
  mapSpotifyTrack,
  transferSpotifyPlayback,
} from "../services/spotifyApi";
import {
  completeSpotifyAuthorization,
  getStoredSpotifySession,
} from "../services/spotifyAuth";
import { destroySpotifyPlayer, initializeSpotifyPlayer } from "../services/spotifyPlayer";

function parseSpotifyError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Spotify error";

  if (message.includes("PREMIUM_REQUIRED")) {
    return {
      message: "Spotify Web Playback SDK requires a Premium account for browser playback.",
      requiresPremium: true,
    };
  }

  return {
    message,
    requiresPremium: false,
  };
}

async function syncSpotifyQueueState() {
  const { syncPlayback, setSpotifyState } = useQuaverStore.getState();

  try {
    const [queueState, playbackState] = await Promise.all([
      fetchSpotifyQueue(),
      fetchSpotifyPlaybackState(),
    ]);

    const currentTrack = mapSpotifyTrack(queueState?.currently_playing ?? playbackState?.item);
    const nextTracks = (queueState?.queue ?? [])
      .map((track: any) => mapSpotifyTrack(track))
      .filter(Boolean);

    if (!currentTrack) {
      return;
    }

    syncPlayback({
      queue: [currentTrack, ...nextTracks],
      currentTrackIndex: 0,
      isPlaying: playbackState?.is_playing ?? true,
      progress: Math.round((playbackState?.progress_ms ?? 0) / 1000),
      volume: playbackState?.device?.volume_percent,
      playbackSource: "spotify",
      isShuffleEnabled: playbackState?.shuffle_state ?? false,
      repeatMode: playbackState?.repeat_state ?? "off",
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
  const setPlaylists = useQuaverStore((state) => state.setPlaylists);
  const updatePlaylistTracks = useQuaverStore((state) => state.updatePlaylistTracks);
  const setSpotifyState = useQuaverStore((state) => state.setSpotifyState);
  const syncPlayback = useQuaverStore((state) => state.syncPlayback);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSpotify() {
      if (!isSpotifyConfigured()) {
        setSpotifyState({ isConfigured: false });
        return;
      }

      setSpotifyState({ isConfigured: true, error: null });

      try {
        const session = await completeSpotifyAuthorization();
        if (!session || cancelled) {
          return;
        }

        startTransition(() => {
          setSpotifyState({
            isAuthenticated: true,
            accessToken: session.accessToken,
            error: null,
          });
        });

        const [profile, spotifyPlaylists] = await Promise.all([
          fetchSpotifyProfile(),
          fetchSpotifyPlaylists(),
        ]);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSpotifyState({
            userName: profile.display_name ?? "Spotify listener",
          });
          if (spotifyPlaylists.length) {
            setPlaylists(spotifyPlaylists);
          }
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const parsed = parseSpotifyError(error);
        setSpotifyState({
          error: parsed.message,
          requiresPremium: parsed.requiresPremium,
          isAuthenticated: Boolean(getStoredSpotifySession()),
        });
      }
    }

    bootstrapSpotify();

    return () => {
      cancelled = true;
    };
  }, [setPlaylists, setSpotifyState]);

  useEffect(() => {
    if (!spotify.accessToken || !isSpotifyConfigured()) {
      return;
    }

    let cancelled = false;

    initializeSpotifyPlayer({
      initialVolume: useQuaverStore.getState().volume / 100,
      onReady: async (deviceId) => {
        if (cancelled) {
          return;
        }

        setSpotifyState({
          deviceId,
          isAuthenticated: true,
          error: null,
        });

        try {
          await transferSpotifyPlayback(deviceId, false);
          await syncSpotifyQueueState();
        } catch (error) {
          const parsed = parseSpotifyError(error);
          setSpotifyState({
            error: parsed.message,
            requiresPremium: parsed.requiresPremium,
          });
        }
      },
      onOffline: () => {
        if (!cancelled) {
          setSpotifyState({ deviceId: null });
        }
      },
      onStateChange: (state) => {
        if (cancelled || !state?.track_window?.current_track) {
          return;
        }

        const currentTrack = mapSpotifyTrack(state.track_window.current_track);
        const nextTracks = (state.track_window.next_tracks ?? [])
          .map((track: any) => mapSpotifyTrack(track))
          .filter(Boolean);

        if (!currentTrack) {
          return;
        }

        syncPlayback({
          queue: [currentTrack, ...nextTracks],
          currentTrackIndex: 0,
          isPlaying: !state.paused,
          progress: Math.round((state.position ?? 0) / 1000),
          playbackSource: "spotify",
        });
      },
      onError: (message) => {
        if (!cancelled) {
          setSpotifyState({ error: message });
        }
      },
    });

    return () => {
      cancelled = true;
      destroySpotifyPlayer();
    };
  }, [setSpotifyState, spotify.accessToken, syncPlayback]);

  useEffect(() => {
    const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);

    if (
      !selectedPlaylist ||
      !selectedPlaylist.spotifyId ||
      selectedPlaylist.tracks.length > 0 ||
      !getStoredSpotifySession()
    ) {
      return;
    }

    let cancelled = false;
    const playlistId = selectedPlaylist.id;
    const spotifyPlaylistId = selectedPlaylist.spotifyId;

    async function loadPlaylistTracks() {
      try {
        const tracks = await fetchSpotifyPlaylistTracks(spotifyPlaylistId);
        if (!cancelled) {
          updatePlaylistTracks(playlistId, tracks);
        }
      } catch (error) {
        if (!cancelled) {
          const parsed = parseSpotifyError(error);
          setSpotifyState({ error: parsed.message });
        }
      }
    }

    loadPlaylistTracks();

    return () => {
      cancelled = true;
    };
  }, [playlists, selectedPlaylistId, setSpotifyState, updatePlaylistTracks]);

  useEffect(() => {
    if (!spotify.accessToken) {
      return;
    }

    const timer = window.setInterval(() => {
      syncSpotifyQueueState();
    }, 15000);

    syncSpotifyQueueState();

    return () => window.clearInterval(timer);
  }, [spotify.accessToken]);
}
