import { useRef } from "react";
import { formatBackendError, getBackendRetryAfterSeconds, isBackendRateLimitError } from "../api/http";
import {
  addTrackToBackendPlaylist,
  startBackendPlayback,
  updateBackendPlaybackState,
} from "../features/library/api/client";
import type { BackendPlaybackState } from "../features/library/api/types";
import {
  beginSpotifyBridgeAuthorization,
  pauseSpotifyPlayback,
  seekSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  setSpotifyVolume,
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
  const setIsPlaying = useQuaverStore((state) => state.setIsPlaying);
  const setProgress = useQuaverStore((state) => state.setProgress);
  const setVolume = useQuaverStore((state) => state.setVolume);
  const syncPlayback = useQuaverStore((state) => state.syncPlayback);
  const addTrackToPlaylistLocal = useQuaverStore((state) => state.addTrackToPlaylist);
  const replaceBackendPlaylists = useQuaverStore((state) => state.replaceBackendPlaylists);
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
  const seekSequenceRef = useRef(0);
  const seekDebounceRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  function getQueueIndex(track: Track) {
    return queue.findIndex(
      (queuedTrack) =>
        (queuedTrack.spotifyId ?? queuedTrack.id) === (track.spotifyId ?? track.id),
    );
  }

  function sameTrack(left?: Track, right?: Track) {
    if (!left || !right) {
      return false;
    }

    return (left.spotifyId ?? left.id) === (right.spotifyId ?? right.id);
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
      queue: state.queue,
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

  function syncSpotifyTransportResponse(playback: SpotifyPlaybackState) {
    syncPlayback({
      isPlaying: playback.isPlaying,
      progress: playback.progress,
      volume: playback.volume,
      playbackSource: playback.playbackSource ?? "spotify",
      isShuffleEnabled: playback.isShuffleEnabled,
      repeatMode: playback.repeatMode,
    });
  }

  function warnSpotifyPlayback(error: unknown, dedupeKey: string) {
    if (isBackendRateLimitError(error)) {
      const retryAfterSeconds = getBackendRetryAfterSeconds(error);
      pushNotice({
        message:
          retryAfterSeconds == null
            ? "Spotify is handling too many requests right now. Please wait a moment and try again."
            : `Spotify is handling too many requests right now. Please retry in ${retryAfterSeconds} seconds.`,
        variant: "warning",
        dedupeKey: "spotify-rate-limit",
      });
      return;
    }

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
      message:
        "The Spotify bridge is not ready yet. Quaver can keep your playlists locally, but Spotify playback still needs the shared bridge account to be authorized.",
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
        setIsPlaying(false);
        syncSpotifyTransportResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
        await syncBackendPlaybackSnapshot("playback-toggle");
        return;
      }

      const currentTrack = queue[currentTrackIndex];
      if (currentTrack?.spotifyUri) {
        setIsPlaying(true);
        await syncBackendPlaybackSnapshot("playback-toggle");
        await restartSpotifyPlaybackFromCurrentQueue("spotify-toggle");
      }
    } catch (error) {
      setIsPlaying(isPlaying);
      warnSpotifyPlayback(error, "spotify-toggle");
    }
  }

  async function playNext() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      playNextLocal();
      await syncBackendPlaybackSnapshot("playback-next");
      return;
    }

    playNextLocal();
    await syncBackendPlaybackSnapshot("playback-next");
    await restartSpotifyPlaybackFromCurrentQueue("spotify-next", true);
  }

  async function playPrevious() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      playPreviousLocal();
      await syncBackendPlaybackSnapshot("playback-previous");
      return;
    }

    playPreviousLocal();
    await syncBackendPlaybackSnapshot("playback-previous");
    await restartSpotifyPlaybackFromCurrentQueue("spotify-previous");
  }

  function seek(nextProgress: number) {
    const requestId = seekSequenceRef.current + 1;
    seekSequenceRef.current = requestId;
    setProgress(nextProgress);

    if (seekDebounceRef.current) {
      window.clearTimeout(seekDebounceRef.current);
    }

    seekDebounceRef.current = window.setTimeout(async () => {
      const shouldSyncSpotify = playbackSource === "spotify" && spotify.isAuthenticated;
      if (!shouldSyncSpotify) {
        try {
          const response = await updateBackendPlaybackState({
            ...currentBackendPlaybackSnapshot(),
            progress: nextProgress,
          });
          if (requestId === seekSequenceRef.current && response.playback) {
            syncPlayback(response.playback);
          }
        } catch (error) {
          if (requestId === seekSequenceRef.current) {
            warnPlaybackSync(error, "playback-seek");
          }
        }
        return;
      }

      try {
        const playback = await seekSpotifyPlayback(Math.round(nextProgress * 1000), spotifyDeviceId());
        if (requestId === seekSequenceRef.current) {
          syncSpotifyTransportResponse(playback);
          await syncBackendPlaybackSnapshot("playback-seek");
        }
      } catch (error) {
        if (requestId === seekSequenceRef.current) {
          warnSpotifyPlayback(error, "spotify-seek");
        }
      }
    }, 180);
  }

  async function updateVolume(volume: number) {
    setVolume(volume);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      await syncBackendPlaybackSnapshot("playback-volume");
      return;
    }

    await syncBackendPlaybackSnapshot("playback-volume");

    try {
      syncSpotifyTransportResponse(await setSpotifyVolume(volume, spotifyDeviceId()));
      await syncBackendPlaybackSnapshot("playback-volume");
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-volume");
    }
  }

  async function playPlaylistTrack(playlist: Playlist, index: number) {
    await playTrackList(playlist.tracks, index, `playlist-${playlist.id}`);
  }

  async function playTrackList(tracks: Track[], startIndex = 0, dedupeKey = "track-list") {
    const startTrack = tracks[startIndex] ?? tracks[0];
    const playableQueue = tracks.filter((track) => track.spotifyUri);
    const spotifyUris = playableQueue
      .map((track) => track.spotifyUri)
      .filter((uri): uri is string => Boolean(uri));

    if (startTrack?.spotifyUri && !spotify.isAuthenticated) {
      syncPlayback({
        queue: tracks,
        currentTrackIndex: startIndex,
        isPlaying: false,
        progress: 0,
        playbackSource: "backend",
      });
      promptSpotifyConnection(`spotify-connect-${dedupeKey}`);
      return;
    }

    if (!startTrack?.spotifyUri || !spotifyUris.length) {
      setQueue(tracks, startIndex, "backend");
      await startBackendPlaybackSnapshot(tracks, startIndex, `playback-${dedupeKey}`);
      return;
    }

    try {
      setQueue(tracks, startIndex, "spotify");
      await syncBackendPlaybackSnapshot(`playback-${dedupeKey}`);
      await restartSpotifyPlaybackFromCurrentQueue(`spotify-${dedupeKey}`);
    } catch (error) {
      warnSpotifyPlayback(error, `spotify-${dedupeKey}`);
    }
  }

  async function restartSpotifyPlaybackFromCurrentQueue(
    dedupeKey: string,
    pauseWhenStopped = false,
  ) {
    const state = useQuaverStore.getState();
    const currentTrack = state.queue[state.currentTrackIndex] ?? state.queue[0];
    const playableQueue = state.queue.filter((track) => track.spotifyUri);

    if (!state.isPlaying) {
      if (pauseWhenStopped) {
        try {
          syncSpotifyTransportResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
        } catch (error) {
          warnSpotifyPlayback(error, dedupeKey);
        }
      }
      return;
    }

    if (!currentTrack?.spotifyUri || !playableQueue.length) {
      try {
        syncSpotifyTransportResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
      } catch (error) {
        warnSpotifyPlayback(error, dedupeKey);
      }
      return;
    }

    try {
      syncSpotifyTransportResponse(
        await startSpotifyPlayback({
          deviceId: spotifyDeviceId(),
          uris: playableQueue
            .map((track) => track.spotifyUri)
            .filter((uri): uri is string => Boolean(uri)),
          offsetPosition: Math.max(
            0,
            playableQueue.findIndex((track) => sameTrack(track, currentTrack)),
          ),
          positionMs: Math.max(0, Math.round(state.progress * 1000)),
        }),
      );
    } catch (error) {
      warnSpotifyPlayback(error, dedupeKey);
    }
  }

  async function applyAgentPlaybackMutation(
    playback: BackendPlaybackState,
    playbackCommand = "sync",
  ) {
    if (playbackCommand === "queue_clear") {
      syncPlayback(playback);
      if (playback.playbackSource === "spotify" && spotify.isAuthenticated) {
        try {
          syncSpotifyTransportResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
        } catch (error) {
          warnSpotifyPlayback(error, "spotify-agent-queue-clear");
        }
      }
      return;
    }

    if (!playback.queue.length || playback.playbackSource !== "spotify") {
      syncPlayback(playback);
      return;
    }

    if (playbackCommand === "pause") {
      syncPlayback(playback);
      if (!spotify.isAuthenticated) {
        return;
      }

      try {
        syncSpotifyTransportResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
      } catch (error) {
        warnSpotifyPlayback(error, "spotify-agent-pause");
      }
      return;
    }

    if (playbackCommand === "start" || playbackCommand === "seek_to_index") {
      await playTrackList(
        playback.queue,
        playback.currentTrackIndex,
        `agent-${playbackCommand}`,
      );
      return;
    }

    if (playbackCommand === "queue_insert_next") {
      syncPlayback(playback);
      if (spotify.isAuthenticated) {
        await restartSpotifyPlaybackFromCurrentQueue(`spotify-agent-${playbackCommand}`);
      }
      return;
    }

    if (playbackCommand === "queue_remove") {
      syncPlayback(playback);
      if (spotify.isAuthenticated) {
        await restartSpotifyPlaybackFromCurrentQueue(`spotify-agent-${playbackCommand}`);
      }
      return;
    }

    if (playbackCommand === "queue_append") {
      syncPlayback(playback);
      if (spotify.isAuthenticated) {
        await restartSpotifyPlaybackFromCurrentQueue(`spotify-agent-${playbackCommand}`);
      }
      return;
    }

    syncPlayback(playback);
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

    await playTrackList(queue, index);
  }

  async function toggleShuffleMode() {
    toggleShuffleLocal();
    await syncBackendPlaybackSnapshot("playback-shuffle");

    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      return;
    }

    const nextValue = useQuaverStore.getState().isShuffleEnabled;
    try {
      syncSpotifyTransportResponse(await setSpotifyShuffle(nextValue, spotifyDeviceId()));
      await syncBackendPlaybackSnapshot("playback-shuffle");
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-shuffle");
    }
  }

  async function cycleRepeatMode() {
    cycleRepeatModeLocal();
    await syncBackendPlaybackSnapshot("playback-repeat");

    if (playbackSource !== "spotify" || !spotify.isAuthenticated) {
      return;
    }

    const nextMode = useQuaverStore.getState().repeatMode;

    try {
      syncSpotifyTransportResponse(await setSpotifyRepeatMode(nextMode, spotifyDeviceId()));
      await syncBackendPlaybackSnapshot("playback-repeat");
    } catch (error) {
      warnSpotifyPlayback(error, "spotify-repeat");
    }
  }

  async function queueTrackNext(track: Track) {
    const beforeState = useQuaverStore.getState();
    const beforeCurrentTrack = beforeState.queue[beforeState.currentTrackIndex];
    if (sameTrack(beforeCurrentTrack, track)) {
      return;
    }

    insertTrackNextLocal(track);
    await syncBackendPlaybackSnapshot(`queue-next-${track.id}`);

    const nextState = useQuaverStore.getState();
    if (
      nextState.playbackSource === "spotify" &&
      spotify.isAuthenticated &&
      track.spotifyUri
    ) {
      await restartSpotifyPlaybackFromCurrentQueue(`spotify-queue-next-${track.id}`);
    }
  }

  async function moveQueueTrackToFront(track: Track) {
    const state = useQuaverStore.getState();
    const currentTrack = state.queue[state.currentTrackIndex];
    const targetIndex = state.queue.findIndex((queuedTrack) => sameTrack(queuedTrack, track));

    if (targetIndex < 0 || sameTrack(currentTrack, track)) {
      return;
    }

    insertTrackNextLocal(track);
    await syncBackendPlaybackSnapshot(`queue-move-front-${track.id}`);

    const nextState = useQuaverStore.getState();
    if (
      nextState.playbackSource === "spotify" &&
      spotify.isAuthenticated &&
      nextState.queue[nextState.currentTrackIndex]?.spotifyUri
    ) {
      await restartSpotifyPlaybackFromCurrentQueue(`spotify-queue-move-front-${track.id}`);
    }
  }

  async function queueTrackLater(track: Track) {
    if (getQueueIndex(track) >= 0) {
      return;
    }

    appendTrackToQueueLocal(track);
    await syncBackendPlaybackSnapshot(`queue-append-${track.id}`);

    const nextState = useQuaverStore.getState();
    if (
      nextState.playbackSource === "spotify" &&
      spotify.isAuthenticated
    ) {
      await restartSpotifyPlaybackFromCurrentQueue(`spotify-queue-append-${track.id}`);
    }
  }

  async function addTrackToPlaylist(playlist: Playlist, track: Track) {
    try {
      const response = await addTrackToBackendPlaylist(playlist.id, {
        trackId: track.id,
      });
      if (response.playlists) {
        replaceBackendPlaylists(response.playlists, response.selectedPlaylistId);
        return;
      }
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

  async function removeQueueTrack(track: Track) {
    const state = useQuaverStore.getState();
    const removeIndex = state.queue.findIndex((queuedTrack) => sameTrack(queuedTrack, track));
    if (removeIndex < 0) {
      return;
    }

    const activeTrack = state.queue[state.currentTrackIndex];
    const nextQueue = state.queue.filter((queuedTrack) => !sameTrack(queuedTrack, track));
    const nextCurrentTrackIndex =
      activeTrack && nextQueue.length
        ? Math.max(0, nextQueue.findIndex((queuedTrack) => sameTrack(queuedTrack, activeTrack)))
        : 0;

    syncPlayback({
      queue: nextQueue,
      currentTrackIndex: nextCurrentTrackIndex < 0 ? Math.min(removeIndex, nextQueue.length - 1) : nextCurrentTrackIndex,
      isPlaying: nextQueue.length ? state.isPlaying : false,
      progress: sameTrack(activeTrack, track) ? 0 : state.progress,
      playbackSource: state.playbackSource,
    });
    await syncBackendPlaybackSnapshot(`queue-remove-${track.id}`);

    const nextState = useQuaverStore.getState();
    if (nextState.playbackSource === "spotify" && spotify.isAuthenticated) {
      if (!nextState.queue.length) {
        try {
          syncSpotifyTransportResponse(await pauseSpotifyPlayback(spotifyDeviceId()));
        } catch (error) {
          warnSpotifyPlayback(error, `spotify-queue-remove-${track.id}`);
        }
        return;
      }

      await restartSpotifyPlaybackFromCurrentQueue(`spotify-queue-remove-${track.id}`);
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
    moveQueueTrackToFront,
    queueTrackLater,
    addTrackToPlaylist,
    applyAgentPlaybackMutation,
    removeQueueTrack,
  };
}
