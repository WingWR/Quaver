import { formatBackendError } from "../api/http";
import {
  addTrackToBackendPlaylist,
  appendTrackToBackendQueue,
  insertTrackNextInBackendQueue,
  startBackendPlayback,
  updateBackendPlaybackState,
} from "../features/library/api/client";
import {
  addTrackToSpotifyQueue,
  addTracksToSpotifyPlaylist,
  beginSpotifyBridgeAuthorization,
  pauseSpotifyPlayback,
  seekSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
  skipToNextSpotifyTrack,
  skipToPreviousSpotifyTrack,
  startSpotifyPlayback,
} from "../features/spotify/api/client";
import type { SpotifyPlaybackState } from "../features/spotify/api/types";
import { useQuaverStore } from "../store/useQuaverStore";
import { useUiStore } from "../store/useUiStore";
import type { Playlist, Track } from "../types/music";

export function usePlaybackControllerRuntime() {
  const spotify = useQuaverStore((state) => state.spotify);
  const setQueue = useQuaverStore((state) => state.setQueue);
  const setCurrentTrackIndex = useQuaverStore((state) => state.setCurrentTrackIndex);
  const setProgress = useQuaverStore((state) => state.setProgress);
  const setVolume = useQuaverStore((state) => state.setVolume);
  const syncPlayback = useQuaverStore((state) => state.syncPlayback);
  const addTrackToPlaylistLocal = useQuaverStore((state) => state.addTrackToPlaylist);
  const togglePlaybackLocal = useQuaverStore((state) => state.togglePlayback);
  const playNextLocal = useQuaverStore((state) => state.playNext);
  const playPreviousLocal = useQuaverStore((state) => state.playPrevious);
  const insertTrackNextLocal = useQuaverStore((state) => state.insertTrackNext);
  const appendTrackToQueueLocal = useQuaverStore((state) => state.appendTrackToQueue);
  const toggleShuffleLocal = useQuaverStore((state) => state.toggleShuffle);
  const cycleRepeatModeLocal = useQuaverStore((state) => state.cycleRepeatMode);
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const isPlaying = useQuaverStore((state) => state.isPlaying);
  const playbackSource = useQuaverStore((state) => state.playbackSource);
  const isShuffleEnabled = useQuaverStore((state) => state.isShuffleEnabled);
  const repeatMode = useQuaverStore((state) => state.repeatMode);
  const pushNotice = useUiStore((state) => state.pushNotice);

  function getQueueIndex(track: Track) {
    return queue.findIndex(
      (queuedTrack) =>
        (queuedTrack.spotifyId ?? queuedTrack.id) === (track.spotifyId ?? track.id),
    );
  }

  async function connectSpotify() {
    if (!spotify.isConfigured) {
      pushNotice({
        message: spotify.error ?? "Spotify bridge is not configured on the backend yet.",
        variant: "warning",
        dedupeKey: "spotify-connect-unconfigured",
      });
      return;
    }

    beginSpotifyBridgeAuthorization();
  }

  function spotifyDeviceId() {
    return spotify.deviceId || undefined;
  }

  function currentBackendPlaybackSnapshot() {
    const state = useQuaverStore.getState();

    return {
      currentTrackIndex: state.currentTrackIndex,
      isPlaying: state.isPlaying,
      progress: state.progress,
      volume: state.volume,
      playbackSource: state.playbackSource,
      isShuffleEnabled: state.isShuffleEnabled,
      repeatMode: state.repeatMode,
    };
  }

  function warnPlaybackSync(error: unknown, dedupeKey: string) {
    pushNotice({
      message: formatBackendError(
        error,
        "Playback state is only updated locally because the backend session endpoint is unavailable.",
      ),
      variant: "warning",
      dedupeKey,
    });
  }

  async function syncBackendPlaybackSnapshot(dedupeKey: string) {
    try {
      const response = await updateBackendPlaybackState(currentBackendPlaybackSnapshot());
      if (response.playback) {
        syncPlayback(response.playback);
      }
    } catch (error) {
      warnPlaybackSync(error, dedupeKey);
    }
  }

  async function startBackendPlaybackSnapshot(
    tracks: Track[],
    startIndex: number,
    dedupeKey: string,
  ) {
    try {
      const response = await startBackendPlayback({
        tracks,
        startIndex,
        playbackSource: "backend",
      });
      if (response.playback) {
        syncPlayback(response.playback);
      }
    } catch (error) {
      warnPlaybackSync(error, dedupeKey);
    }
  }

  function syncSpotifyPlaybackResponse(playback: SpotifyPlaybackState) {
    syncPlayback({
      queue: playback.queue,
      currentTrackIndex: playback.currentTrackIndex,
      isPlaying: playback.isPlaying,
      progress: playback.progress,
      volume: playback.volume,
      playbackSource: playback.playbackSource ?? "spotify",
      isShuffleEnabled: playback.isShuffleEnabled,
      repeatMode: playback.repeatMode,
    });
  }

  function warnSpotifyPlayback(error: unknown, dedupeKey: string) {
    pushNotice({
      message: formatBackendError(
        error,
        "Spotify playback is not ready. Make sure the backend bridge is authorized and a Spotify device is active.",
      ),
      variant: "warning",
      dedupeKey,
    });
  }

  function promptSpotifyConnection(dedupeKey: string) {
    pushNotice({
      message: "Connect Spotify first. Search results are Spotify tracks, so Quaver cannot play them locally.",
      variant: "warning",
      dedupeKey,
    });
    beginSpotifyBridgeAuthorization();
  }

  async function togglePlayback() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      togglePlaybackLocal();
      await syncBackendPlaybackSnapshot("playback-toggle");
      return;
    }

    try {
      if (isPlaying) {
        syncSpotifyPlaybackResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
        return;
      }

      const currentTrack = queue[currentTrackIndex];
      if (currentTrack?.spotifyUri) {
        syncSpotifyPlaybackResponse(
          await startSpotifyPlayback({
            deviceId: spotifyDeviceId(),
            uris: [currentTrack.spotifyUri],
          }),
        );
      }
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-toggle");
    }
  }

  async function playNext() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      playNextLocal();
      await syncBackendPlaybackSnapshot("playback-next");
      return;
    }

    try {
      syncSpotifyPlaybackResponse(await skipToNextSpotifyTrack(spotifyDeviceId()));
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-next");
    }
  }

  async function playPrevious() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      playPreviousLocal();
      await syncBackendPlaybackSnapshot("playback-previous");
      return;
    }

    try {
      syncSpotifyPlaybackResponse(await skipToPreviousSpotifyTrack(spotifyDeviceId()));
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-previous");
    }
  }

  async function seek(progress: number) {
    setProgress(progress);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      await syncBackendPlaybackSnapshot("playback-seek");
      return;
    }

    try {
      syncSpotifyPlaybackResponse(await seekSpotifyPlayback(progress * 1000, spotifyDeviceId()));
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-seek");
    }
  }

  async function updateVolume(volume: number) {
    setVolume(volume);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      await syncBackendPlaybackSnapshot("playback-volume");
      return;
    }

    try {
      syncSpotifyPlaybackResponse(await setSpotifyVolume(volume, spotifyDeviceId()));
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-volume");
    }
  }

  async function playPlaylistTrack(playlist: Playlist, index: number) {
    if (playlist.source === "spotify" && !spotify.isAuthenticated) {
      syncPlayback({
        queue: playlist.tracks,
        currentTrackIndex: index,
        isPlaying: false,
        progress: 0,
        playbackSource: "backend",
      });
      promptSpotifyConnection(`spotify-connect-playlist-${playlist.id}`);
      return;
    }

    if (playlist.source !== "spotify") {
      setQueue(playlist.tracks, index, "backend");
      await startBackendPlaybackSnapshot(playlist.tracks, index, `playback-playlist-${playlist.id}`);
      return;
    }

    try {
      syncSpotifyPlaybackResponse(
        await startSpotifyPlayback({
          deviceId: spotifyDeviceId(),
          contextUri: playlist.spotifyUri,
          offsetPosition: index,
          positionMs: 0,
        }),
      );
    } catch (error) {
      warnSpotifyPlayback(error, `spotify-playlist-${playlist.id}`);
    }
  }

  async function playTrackList(tracks: Track[], startIndex = 0) {
    const queueSlice = tracks.slice(startIndex);
    const spotifyUris = queueSlice
      .map((track) => track.spotifyUri)
      .filter((uri): uri is string => Boolean(uri));

    if (spotifyUris.length && !spotify.isAuthenticated) {
      syncPlayback({
        queue: tracks,
        currentTrackIndex: startIndex,
        isPlaying: false,
        progress: 0,
        playbackSource: "backend",
      });
      promptSpotifyConnection("spotify-connect-track-list");
      return;
    }

    if (!spotifyUris.length) {
      setQueue(tracks, startIndex, "backend");
      await startBackendPlaybackSnapshot(tracks, startIndex, "playback-track-list");
      return;
    }

    try {
      syncSpotifyPlaybackResponse(
        await startSpotifyPlayback({
          deviceId: spotifyDeviceId(),
          uris: spotifyUris,
          positionMs: 0,
        }),
      );
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-track-list");
    }
  }

  async function playQueueTrack(track: Track, index: number) {
    if (track.spotifyUri && !spotify.isAuthenticated) {
      syncPlayback({
        queue,
        currentTrackIndex: index,
        isPlaying: false,
        progress: 0,
        playbackSource: "backend",
      });
      promptSpotifyConnection(`spotify-connect-queue-${track.id}`);
      return;
    }

    if (!track.spotifyUri) {
      setCurrentTrackIndex(index);
      await syncBackendPlaybackSnapshot("playback-queue-track");
      return;
    }

    await playTrackList(queue.slice(index), 0);
  }

  async function toggleShuffleMode() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      toggleShuffleLocal();
      await syncBackendPlaybackSnapshot("playback-shuffle");
      return;
    }

    const nextValue = !isShuffleEnabled;
    try {
      syncSpotifyPlaybackResponse(await setSpotifyShuffle(nextValue, spotifyDeviceId()));
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-shuffle");
    }
  }

  async function cycleRepeatMode() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      cycleRepeatModeLocal();
      await syncBackendPlaybackSnapshot("playback-repeat");
      return;
    }

    const nextMode =
      repeatMode === "off" ? "context" : repeatMode === "context" ? "track" : "off";

    try {
      syncSpotifyPlaybackResponse(await setSpotifyRepeatMode(nextMode, spotifyDeviceId()));
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-repeat");
    }
  }

  async function queueTrackNext(track: Track) {
    const existingIndex = getQueueIndex(track);
    insertTrackNextLocal(track);

    if (playbackSource === "backend") {
      try {
        const response = await insertTrackNextInBackendQueue({
          trackId: track.id,
        });
        if (response.playback) {
          syncPlayback(response.playback);
        }
      } catch (error) {
        pushNotice({
          message: formatBackendError(
            error,
            "Queue backend is unavailable. The track was only inserted locally.",
          ),
          variant: "warning",
          dedupeKey: `queue-next-${track.id}`,
        });
      }
    }

    if (
      existingIndex === -1 &&
      playbackSource === "spotify" &&
      spotify.isAuthenticated &&
      track.spotifyUri
    ) {
      try {
        syncSpotifyPlaybackResponse(await addTrackToSpotifyQueue(track.spotifyUri, spotifyDeviceId()));
      } catch (error) {
        warnSpotifyPlayback(error, `spotify-queue-next-${track.id}`);
      }
    }
  }

  async function queueTrackLater(track: Track) {
    if (getQueueIndex(track) >= 0) {
      return;
    }

    if (playbackSource === "backend") {
      try {
        const response = await appendTrackToBackendQueue({
          trackId: track.id,
        });
        if (response.playback) {
          syncPlayback(response.playback);
        }
      } catch (error) {
        pushNotice({
          message: formatBackendError(
            error,
            "Queue backend is unavailable. The track was only queued locally.",
          ),
          variant: "warning",
          dedupeKey: `queue-append-${track.id}`,
        });
      }
    }

    if (
      playbackSource === "spotify" &&
      spotify.isAuthenticated &&
      track.spotifyUri
    ) {
      try {
        syncSpotifyPlaybackResponse(await addTrackToSpotifyQueue(track.spotifyUri, spotifyDeviceId()));
      } catch (error) {
        warnSpotifyPlayback(error, `spotify-queue-append-${track.id}`);
      }
    }

    appendTrackToQueueLocal(track);
  }

  async function addTrackToPlaylist(playlist: Playlist, track: Track) {
    if (playlist.source === "spotify" && playlist.spotifyId && track.spotifyUri) {
      await addTracksToSpotifyPlaylist(playlist.spotifyId, [track.spotifyUri]);
      addTrackToPlaylistLocal(playlist.id, track);
      return;
    }

    try {
      await addTrackToBackendPlaylist(playlist.id, {
        trackId: track.id,
      });
      addTrackToPlaylistLocal(playlist.id, track);
    } catch (error) {
      pushNotice({
        message: formatBackendError(
          error,
          "Playlist backend is unavailable. The track could not be added.",
        ),
        variant: "warning",
        dedupeKey: `playlist-add-${playlist.id}-${track.id}`,
      });
    }
  }

  return {
    spotify,
    connectSpotify,
    togglePlayback,
    playNext,
    playPrevious,
    seek,
    updateVolume,
    playPlaylistTrack,
    playTrackList,
    playQueueTrack,
    isShuffleEnabled,
    repeatMode,
    toggleShuffleMode,
    cycleRepeatMode,
    queueTrackNext,
    queueTrackLater,
    addTrackToPlaylist,
  };
}
