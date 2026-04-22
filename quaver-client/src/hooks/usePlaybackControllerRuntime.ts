import { formatBackendError } from "../api/http";
import {
  addTrackToBackendPlaylist,
  appendTrackToBackendQueue,
  insertTrackNextInBackendQueue,
  startBackendPlayback,
  updateBackendPlaybackState,
} from "../features/library/api/client";
import { useUiStore } from "../store/useUiStore";
import type { Playlist, Track } from "../types/music";
import { useQuaverStore } from "../store/useQuaverStore";
import {
  addTrackToSpotifyQueue,
  addTracksToSpotifyPlaylist,
  pauseSpotifyPlayback,
  setSpotifyRepeatMode,
  setSpotifyShuffle,
  startSpotifyPlayback,
  transferSpotifyPlayback,
} from "../services/spotifyApi";
import { beginSpotifyAuthorization } from "../services/spotifyAuth";
import { getSpotifyPlayer } from "../services/spotifyPlayer";

async function activateSpotifyElement() {
  const player = getSpotifyPlayer();
  if (player?.activateElement) {
    await player.activateElement();
  }
}

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
      return;
    }

    await beginSpotifyAuthorization();
  }

  async function ensureSpotifyDevice() {
    if (!spotify.deviceId) {
      throw new Error("Spotify player is not ready yet");
    }

    await activateSpotifyElement();
    await transferSpotifyPlayback(spotify.deviceId, false);
    return spotify.deviceId;
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

  async function togglePlayback() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      togglePlaybackLocal();
      await syncBackendPlaybackSnapshot("playback-toggle");
      return;
    }

    const player = getSpotifyPlayer();
    if (player) {
      await activateSpotifyElement();
      await player.togglePlay();
      return;
    }

    if (isPlaying) {
      await pauseSpotifyPlayback(spotify.deviceId);
      return;
    }

    const currentTrack = queue[currentTrackIndex];
    if (currentTrack?.spotifyUri) {
      await startSpotifyPlayback({
        deviceId: spotify.deviceId,
        uris: [currentTrack.spotifyUri],
      });
    }
  }

  async function playNext() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      playNextLocal();
      await syncBackendPlaybackSnapshot("playback-next");
      return;
    }

    await activateSpotifyElement();
    await getSpotifyPlayer()?.nextTrack();
  }

  async function playPrevious() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      playPreviousLocal();
      await syncBackendPlaybackSnapshot("playback-previous");
      return;
    }

    await activateSpotifyElement();
    await getSpotifyPlayer()?.previousTrack();
  }

  async function seek(progress: number) {
    setProgress(progress);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      await syncBackendPlaybackSnapshot("playback-seek");
      return;
    }

    await getSpotifyPlayer()?.seek(progress * 1000);
  }

  async function updateVolume(volume: number) {
    setVolume(volume);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      await syncBackendPlaybackSnapshot("playback-volume");
      return;
    }

    await getSpotifyPlayer()?.setVolume(volume / 100);
  }

  async function playPlaylistTrack(playlist: Playlist, index: number) {
    if (!spotify.isAuthenticated || !spotify.deviceId || playlist.source !== "spotify") {
      setQueue(playlist.tracks, index, "backend");
      await startBackendPlaybackSnapshot(playlist.tracks, index, `playback-playlist-${playlist.id}`);
      return;
    }

    const deviceId = await ensureSpotifyDevice();
    await startSpotifyPlayback({
      deviceId,
      contextUri: playlist.spotifyUri,
      offsetPosition: index,
      positionMs: 0,
    });
    syncPlayback({
      queue: playlist.tracks,
      currentTrackIndex: index,
      isPlaying: true,
      progress: 0,
      playbackSource: "spotify",
    });
  }

  async function playTrackList(tracks: Track[], startIndex = 0) {
    const queueSlice = tracks.slice(startIndex);
    const spotifyUris = queueSlice
      .map((track) => track.spotifyUri)
      .filter((uri): uri is string => Boolean(uri));

    if (!spotify.isAuthenticated || !spotify.deviceId || !spotifyUris.length) {
      setQueue(tracks, startIndex, "backend");
      await startBackendPlaybackSnapshot(tracks, startIndex, "playback-track-list");
      return;
    }

    const deviceId = await ensureSpotifyDevice();
    await startSpotifyPlayback({
      deviceId,
      uris: spotifyUris,
      positionMs: 0,
    });
    syncPlayback({
      queue: queueSlice,
      currentTrackIndex: 0,
      isPlaying: true,
      progress: 0,
      playbackSource: "spotify",
    });
  }

  async function playQueueTrack(track: Track, index: number) {
    if (!spotify.isAuthenticated || !spotify.deviceId || !track.spotifyUri) {
      setCurrentTrackIndex(index);
      await syncBackendPlaybackSnapshot("playback-queue-track");
      return;
    }

    await playTrackList(queue.slice(index), 0);
  }

  async function toggleShuffleMode() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      toggleShuffleLocal();
      await syncBackendPlaybackSnapshot("playback-shuffle");
      return;
    }

    const nextValue = !isShuffleEnabled;
    await setSpotifyShuffle(nextValue, spotify.deviceId);
    syncPlayback({
      isShuffleEnabled: nextValue,
      playbackSource: "spotify",
    });
  }

  async function cycleRepeatMode() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      cycleRepeatModeLocal();
      await syncBackendPlaybackSnapshot("playback-repeat");
      return;
    }

    const nextMode =
      repeatMode === "off" ? "context" : repeatMode === "context" ? "track" : "off";

    await setSpotifyRepeatMode(nextMode, spotify.deviceId);
    syncPlayback({
      repeatMode: nextMode,
      playbackSource: "spotify",
    });
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
            "队列后端暂未接入，当前只保留了界面层的插队状态。",
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
      spotify.deviceId &&
      track.spotifyUri
    ) {
      await addTrackToSpotifyQueue(track.spotifyUri, spotify.deviceId);
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
            "队列后端暂未接入，当前只保留了界面层的排队状态。",
          ),
          variant: "warning",
          dedupeKey: `queue-append-${track.id}`,
        });
      }
    }

    if (
      playbackSource === "spotify" &&
      spotify.isAuthenticated &&
      spotify.deviceId &&
      track.spotifyUri
    ) {
      await addTrackToSpotifyQueue(track.spotifyUri, spotify.deviceId);
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
          "歌单后端暂未接入，当前无法把歌曲写入歌单。",
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
