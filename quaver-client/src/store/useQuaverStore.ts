import { create } from "zustand";
import type { LibraryBootstrapResponse } from "../features/library/api/types";
import type {
  CanvasView,
  MusicSource,
  PlaybackSource,
  Playlist,
  RepeatMode,
  Track,
  WorkspaceView,
} from "../types/music";

interface SpotifyState {
  isConfigured: boolean;
  isAuthenticated: boolean;
  deviceId: string | null;
  userName: string | null;
  error: string | null;
  playerReady: boolean;
  playerError: string | null;
  requiresPremium: boolean;
  scopes: string[];
}

interface ResourceState {
  status: "idle" | "loading" | "ready" | "error";
  message: string | null;
  lastLoadedAt: string | null;
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
  agentDraft: string;
  progress: number;
  volume: number;
  canvasView: CanvasView;
  workspaceView: WorkspaceView;
  playbackSource: PlaybackSource;
  isShuffleEnabled: boolean;
  repeatMode: RepeatMode;
  spotify: SpotifyState;
  library: ResourceState;
  replacePlaylistsBySource: (source: MusicSource, playlists: Playlist[]) => void;
  updatePlaylistTracks: (playlistId: string, tracks: Track[]) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  setSelectedPlaylist: (playlistId: string) => void;
  setQueue: (queue: Track[], startIndex?: number, playbackSource?: PlaybackSource) => void;
  syncPlayback: (payload: PlaybackSyncPayload) => void;
  setCurrentTrackIndex: (index: number) => void;
  setAgentDraft: (query: string) => void;
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
  setWorkspaceView: (view: WorkspaceView) => void;
  hydrateBackendLibrary: (payload: LibraryBootstrapResponse) => void;
  replaceBackendPlaylists: (playlists: Playlist[], selectedPlaylistId?: string) => void;
  setLibraryState: (state: Partial<ResourceState>) => void;
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

function normalizeSource(source?: MusicSource): MusicSource {
  return source === "spotify" ? "spotify" : "backend";
}

function derivePlaylistCover(playlist: Playlist) {
  return playlist.tracks[0]?.artwork || playlist.cover;
}

function normalizePlaylist(playlist: Playlist): Playlist {
  return {
    ...playlist,
    source: normalizeSource(playlist.source),
    cover: derivePlaylistCover(playlist),
  };
}

function mergePlaylistsBySource(
  currentPlaylists: Playlist[],
  source: MusicSource,
  incomingPlaylists: Playlist[],
) {
  const nextPlaylists = incomingPlaylists.map((playlist) =>
    normalizePlaylist({
      ...playlist,
      source,
    }),
  );
  const otherPlaylists = currentPlaylists.filter(
    (playlist) => normalizeSource(playlist.source) !== source,
  );

  return source === "backend"
    ? [...nextPlaylists, ...otherPlaylists]
    : [...otherPlaylists, ...nextPlaylists];
}

function resolveSelectedPlaylistId(playlists: Playlist[], candidates: Array<string | undefined>) {
  const availableIds = new Set(playlists.map((playlist) => playlist.id));

  for (const candidate of candidates) {
    if (candidate && availableIds.has(candidate)) {
      return candidate;
    }
  }

  return playlists[0]?.id ?? "";
}

const initialSpotifyState: SpotifyState = {
  isConfigured: false,
  isAuthenticated: false,
  deviceId: null,
  userName: null,
  error: null,
  playerReady: false,
  playerError: null,
  requiresPremium: false,
  scopes: [],
};

const initialResourceState: ResourceState = {
  status: "idle",
  message: null,
  lastLoadedAt: null,
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
  playlists: [],
  queue: [],
  queueRevision: 0,
  selectedPlaylistId: "",
  currentTrackIndex: 0,
  isPlaying: false,
  agentDraft: "",
  progress: 0,
  volume: 72,
  canvasView: "browse",
  workspaceView: "library",
  playbackSource: "backend",
  isShuffleEnabled: false,
  repeatMode: "off",
  spotify: initialSpotifyState,
  library: initialResourceState,
  replacePlaylistsBySource: (source, incomingPlaylists) =>
    set((state) => {
      const playlists = mergePlaylistsBySource(state.playlists, source, incomingPlaylists);

      return {
        playlists,
        selectedPlaylistId: resolveSelectedPlaylistId(playlists, [
          state.selectedPlaylistId,
          incomingPlaylists[0]?.id,
        ]),
      };
    }),
  updatePlaylistTracks: (playlistId, tracks) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) =>
        playlist.id === playlistId ? normalizePlaylist({ ...playlist, tracks }) : playlist,
      ),
    })),
  addTrackToPlaylist: (playlistId, track) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) =>
        playlist.id === playlistId &&
        !playlist.tracks.some((existingTrack) => existingTrack.id === track.id)
          ? normalizePlaylist({ ...playlist, tracks: [...playlist.tracks, track] })
          : playlist,
      ),
    })),
  setSelectedPlaylist: (selectedPlaylistId) =>
    set({
      selectedPlaylistId,
      canvasView: "browse",
      workspaceView: "library",
    }),
  setQueue: (queue, startIndex = 0, playbackSource = "backend") =>
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
      const hasQueuePayload = payload.queue !== undefined;
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
        queueRevision: hasQueuePayload ? state.queueRevision + 1 : state.queueRevision,
      };
    }),
  setCurrentTrackIndex: (index) =>
    set((state) => ({
      currentTrackIndex: clampIndex(index, state.queue),
      progress: 0,
      isPlaying: state.queue.length > 0,
    })),
  setAgentDraft: (agentDraft) => set({ agentDraft }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlayback: () =>
    set((state) => ({
      isPlaying: state.queue.length ? !state.isPlaying : false,
    })),
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
      const activeTrack = state.queue[state.currentTrackIndex];
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

      const currentTrackIndex = activeTrack
        ? Math.max(
            0,
            queue.findIndex(
              (queuedTrack) =>
                (queuedTrack.spotifyId ?? queuedTrack.id) ===
                (activeTrack.spotifyId ?? activeTrack.id),
            ),
          )
        : state.currentTrackIndex;

      return {
        queue,
        currentTrackIndex,
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
  setWorkspaceView: (workspaceView) => set({ workspaceView }),
  hydrateBackendLibrary: (payload) =>
    set((state) => {
      const playlists = mergePlaylistsBySource(state.playlists, "backend", payload.playlists);
      const playback = payload.playback;
      const normalizedPlayback = playback
        ? normalizeQueue(playback.queue, playback.currentTrackIndex)
        : null;

      return {
        playlists,
        selectedPlaylistId: resolveSelectedPlaylistId(playlists, [
          payload.selectedPlaylistId,
          state.selectedPlaylistId,
        ]),
        queue: normalizedPlayback ? normalizedPlayback.queue : [],
        currentTrackIndex: normalizedPlayback
          ? normalizedPlayback.currentTrackIndex
          : 0,
        isPlaying: playback ? playback.isPlaying ?? false : false,
        progress: playback ? playback.progress ?? 0 : 0,
        volume: playback ? playback.volume ?? state.volume : state.volume,
        playbackSource: playback ? playback.playbackSource ?? "backend" : "backend",
        isShuffleEnabled: playback
          ? playback.isShuffleEnabled ?? state.isShuffleEnabled
          : false,
        repeatMode: playback ? playback.repeatMode ?? state.repeatMode : "off",
        queueRevision: state.queueRevision + 1,
      };
    }),
  replaceBackendPlaylists: (incomingPlaylists, selectedPlaylistId) =>
    set((state) => {
      const playlists = mergePlaylistsBySource(state.playlists, "backend", incomingPlaylists);
      return {
        playlists,
        selectedPlaylistId: resolveSelectedPlaylistId(playlists, [
          selectedPlaylistId,
          state.selectedPlaylistId,
          incomingPlaylists[0]?.id,
        ]),
      };
    }),
  setLibraryState: (library) =>
    set((state) => ({
      library: { ...state.library, ...library },
    })),
  setSpotifyState: (spotify) =>
    set((state) => ({
      spotify: { ...state.spotify, ...spotify },
    })),
}));
