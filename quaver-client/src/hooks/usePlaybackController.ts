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

export function usePlaybackController() {
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

  async function togglePlayback() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      togglePlaybackLocal();
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
      return;
    }

    await activateSpotifyElement();
    await getSpotifyPlayer()?.nextTrack();
  }

  async function playPrevious() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      playPreviousLocal();
      return;
    }

    await activateSpotifyElement();
    await getSpotifyPlayer()?.previousTrack();
  }

  async function seek(progress: number) {
    setProgress(progress);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      return;
    }

    await getSpotifyPlayer()?.seek(progress * 1000);
  }

  async function updateVolume(volume: number) {
    setVolume(volume);

    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      return;
    }

    await getSpotifyPlayer()?.setVolume(volume / 100);
  }

  async function playPlaylistTrack(playlist: Playlist, index: number) {
    if (!spotify.isAuthenticated || !spotify.deviceId || playlist.source !== "spotify") {
      setQueue(playlist.tracks, index, "mock");
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
      setQueue(tracks, startIndex, "mock");
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
      return;
    }

    await playTrackList(queue.slice(index), 0);
  }

  async function toggleShuffleMode() {
    if (playbackSource !== "spotify" || !spotify.isAuthenticated || !spotify.deviceId) {
      toggleShuffleLocal();
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

    // Spotify has no public API to insert a track as the next item in queue.
    // Only append is officially supported, so avoid creating duplicates remotely.
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

    addTrackToPlaylistLocal(playlist.id, track);
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
