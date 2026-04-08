import { create } from "zustand";
import type { Playlist, Track } from "../types/music";
import { mockPlaylists, mockQueue } from "../utils/mockData";

type PlaybackSource = "mock" | "spotify";
type CanvasView = "browse" | "lyrics";
type RepeatMode = "off" | "context" | "track";

interface SpotifyState {
  isConfigured: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  deviceId: string | null;
  userName: string | null;
  error: string | null;
  requiresPremium: boolean;
}

interface PlaybackSyncPayload {
  queue?: Track[];
  currentTrackIndex?: number;
  isPlaying?: boolean;
  progress?: number;
  volume?: number;
  playbackSource?: PlaybackSource;
  isShuffleEnabled?: boolean;
  repeatMode?: RepeatMode;
}

interface QuaverStore {
  playlists: Playlist[];
  queue: Track[];
  queueRevision: number;
  selectedPlaylistId: string;
  currentTrackIndex: number;
  isPlaying: boolean;
  isAgentActive: boolean;
  agentQuery: string;
  progress: number;
  volume: number;
  canvasView: CanvasView;
  playbackSource: PlaybackSource;
  isShuffleEnabled: boolean;
  repeatMode: RepeatMode;
  spotify: SpotifyState;
  setPlaylists: (playlists: Playlist[]) => void;
  updatePlaylistTracks: (playlistId: string, tracks: Track[]) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  setSelectedPlaylist: (playlistId: string) => void;
  setQueue: (queue: Track[], startIndex?: number, playbackSource?: PlaybackSource) => void;
  syncPlayback: (payload: PlaybackSyncPayload) => void;
  setCurrentTrackIndex: (index: number) => void;
  setAgentQuery: (query: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  setProgress: (progress: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  insertTrackNext: (track: Track) => void;
  appendTrackToQueue: (track: Track) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setCanvasView: (view: CanvasView) => void;
  toggleAgent: (nextState?: boolean) => void;
  setSpotifyState: (state: Partial<SpotifyState>) => void;
}

function clampIndex(index: number, queue: Track[]) {
  if (!queue.length) {
    return 0;
  }

  if (index < 0) {
    return queue.length - 1;
  }

  return index % queue.length;
}

function dedupeQueue(queue: Track[]) {
  const seen = new Set<string>();

  return queue.filter((track) => {
    const key = track.spotifyId ?? track.id;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeQueue(queue: Track[], desiredIndex = 0) {
  const activeTrack = queue[desiredIndex];
  const nextQueue = dedupeQueue(queue);

  if (!nextQueue.length) {
    return {
      queue: nextQueue,
      currentTrackIndex: 0,
    };
  }

  const currentTrackIndex = activeTrack
    ? Math.max(
        0,
        nextQueue.findIndex((track) => track.id === activeTrack.id),
      )
    : clampIndex(desiredIndex, nextQueue);

  return {
    queue: nextQueue,
    currentTrackIndex,
  };
}

const initialSpotifyState: SpotifyState = {
  isConfigured: false,
  isAuthenticated: false,
  accessToken: null,
  deviceId: null,
  userName: null,
  error: null,
  requiresPremium: false,
};

function nextRepeatMode(mode: RepeatMode): RepeatMode {
  if (mode === "off") {
    return "context";
  }

  if (mode === "context") {
    return "track";
  }

  return "off";
}

function getNextTrackIndex(
  queue: Track[],
  currentTrackIndex: number,
  isShuffleEnabled: boolean,
  repeatMode: RepeatMode,
) {
  if (!queue.length) {
    return 0;
  }

  if (repeatMode === "track") {
    return currentTrackIndex;
  }

  if (isShuffleEnabled && queue.length > 1) {
    let nextIndex = currentTrackIndex;
    while (nextIndex === currentTrackIndex) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
    return nextIndex;
  }

  const candidate = currentTrackIndex + 1;
  if (candidate >= queue.length) {
    return repeatMode === "context" ? 0 : currentTrackIndex;
  }

  return candidate;
}

export const useQuaverStore = create<QuaverStore>((set) => ({
  playlists: mockPlaylists,
  queue: mockQueue,
  queueRevision: 0,
  selectedPlaylistId: mockPlaylists[0]?.id ?? "",
  currentTrackIndex: 0,
  isPlaying: true,
  isAgentActive: false,
  agentQuery: "",
  progress: 78,
  volume: 72,
  canvasView: "browse",
  playbackSource: "mock",
  isShuffleEnabled: false,
  repeatMode: "off",
  spotify: initialSpotifyState,
  setPlaylists: (playlists) =>
    set((state) => ({
      playlists,
      selectedPlaylistId:
        playlists.find((playlist) => playlist.id === state.selectedPlaylistId)?.id ??
        playlists[0]?.id ??
        "",
    })),
  updatePlaylistTracks: (playlistId, tracks) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, tracks } : playlist,
      ),
    })),
  addTrackToPlaylist: (playlistId, track) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) =>
        playlist.id === playlistId &&
        !playlist.tracks.some((existingTrack) => existingTrack.id === track.id)
          ? { ...playlist, tracks: [...playlist.tracks, track] }
          : playlist,
      ),
    })),
  setSelectedPlaylist: (selectedPlaylistId) => set({ selectedPlaylistId, canvasView: "browse" }),
  setQueue: (queue, startIndex = 0, playbackSource = "mock") =>
    set((state) => {
      const normalized = normalizeQueue(queue, startIndex);
      return {
        queue: normalized.queue,
        currentTrackIndex: normalized.currentTrackIndex,
        progress: 0,
        isPlaying: normalized.queue.length > 0,
        playbackSource,
        queueRevision: state.queueRevision + 1,
      };
    }),
  syncPlayback: (payload) =>
    set((state) => {
      const rawQueue = payload.queue ?? state.queue;
      const normalized = normalizeQueue(
        rawQueue,
        payload.currentTrackIndex ?? state.currentTrackIndex,
      );
      return {
        queue: normalized.queue,
        currentTrackIndex: normalized.currentTrackIndex,
        isPlaying: payload.isPlaying ?? state.isPlaying,
        progress: payload.progress ?? state.progress,
        volume: payload.volume ?? state.volume,
        playbackSource: payload.playbackSource ?? state.playbackSource,
        isShuffleEnabled: payload.isShuffleEnabled ?? state.isShuffleEnabled,
        repeatMode: payload.repeatMode ?? state.repeatMode,
        queueRevision: state.queueRevision + 1,
      };
    }),
  setCurrentTrackIndex: (index) =>
    set((state) => ({
      currentTrackIndex: clampIndex(index, state.queue),
      progress: 0,
      isPlaying: state.queue.length > 0,
    })),
  setAgentQuery: (agentQuery) => set({ agentQuery }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setProgress: (progress) => set({ progress }),
  setVolume: (volume) => set({ volume }),
  playNext: () =>
    set((state) => {
      const nextIndex = getNextTrackIndex(
        state.queue,
        state.currentTrackIndex,
        state.isShuffleEnabled,
        state.repeatMode,
      );

      return {
        currentTrackIndex: clampIndex(nextIndex, state.queue),
        progress: 0,
        isPlaying:
          state.repeatMode === "off" &&
          nextIndex === state.currentTrackIndex &&
          state.currentTrackIndex === state.queue.length - 1
            ? false
            : state.isPlaying,
      };
    }),
  playPrevious: () =>
    set((state) => ({
      currentTrackIndex: clampIndex(state.currentTrackIndex - 1, state.queue),
      progress: 0,
    })),
  insertTrackNext: (track) =>
    set((state) => {
      if (!state.queue.length) {
        return {
          queue: [track],
          currentTrackIndex: 0,
          queueRevision: state.queueRevision + 1,
        };
      }

      const existingIndex = state.queue.findIndex(
        (queuedTrack) =>
          (queuedTrack.spotifyId ?? queuedTrack.id) === (track.spotifyId ?? track.id),
      );

      if (existingIndex === state.currentTrackIndex) {
        return {
          queue: state.queue,
          queueRevision: state.queueRevision,
        };
      }

      const queue = [...state.queue];
      let insertIndex = state.currentTrackIndex + 1;

      if (existingIndex >= 0) {
        const [existingTrack] = queue.splice(existingIndex, 1);
        if (existingIndex < insertIndex) {
          insertIndex -= 1;
        }
        queue.splice(insertIndex, 0, existingTrack);
      } else {
        queue.splice(insertIndex, 0, track);
      }

      return {
        queue,
        queueRevision: state.queueRevision + 1,
      };
    }),
  appendTrackToQueue: (track) =>
    set((state) => {
      const exists = state.queue.some(
        (queuedTrack) =>
          (queuedTrack.spotifyId ?? queuedTrack.id) === (track.spotifyId ?? track.id),
      );

      if (exists) {
        return {
          queue: state.queue,
          queueRevision: state.queueRevision,
        };
      }

      return {
        queue: [...state.queue, track],
        queueRevision: state.queueRevision + 1,
      };
    }),
  toggleShuffle: () =>
    set((state) => ({
      isShuffleEnabled: !state.isShuffleEnabled,
    })),
  cycleRepeatMode: () =>
    set((state) => ({
      repeatMode: nextRepeatMode(state.repeatMode),
    })),
  setCanvasView: (canvasView) => set({ canvasView }),
  toggleAgent: (nextState) =>
    set((state) => ({
      isAgentActive: typeof nextState === "boolean" ? nextState : !state.isAgentActive,
    })),
  setSpotifyState: (spotify) =>
    set((state) => ({
      spotify: { ...state.spotify, ...spotify },
    })),
}));
