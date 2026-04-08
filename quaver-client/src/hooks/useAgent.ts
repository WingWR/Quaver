import { useDeferredValue } from "react";
import type { AgentResponse, Playlist, Track } from "../types/music";
import { useQuaverStore } from "../store/useQuaverStore";

function scoreTrack(track: Track, query: string) {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return 0;
  }

  let score = 0;

  if (track.title.toLowerCase().includes(normalizedQuery)) {
    score += 5;
  }

  if (track.artist.toLowerCase().includes(normalizedQuery)) {
    score += 4;
  }

  if (track.album.toLowerCase().includes(normalizedQuery)) {
    score += 2;
  }

  if (track.mood.toLowerCase().includes(normalizedQuery)) {
    score += 4;
  }

  track.genres.forEach((genre) => {
    if (genre.toLowerCase().includes(normalizedQuery)) {
      score += 3;
    }
  });

  return score;
}

function resolvePreset(query: string) {
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.startsWith("/chill")) {
    return {
      title: "Agent: Chill Stack",
      summary: "降低密度，切换到更柔和的 lo-fi / ambient 轨道。",
      type: "playlist" as const,
    };
  }

  if (normalizedQuery.startsWith("/focus")) {
    return {
      title: "Agent: Focus Loop",
      summary: "优先保留节奏稳定、歌词干扰较低的内容。",
      type: "playlist" as const,
    };
  }

  if (normalizedQuery.startsWith("/boost")) {
    return {
      title: "Agent: Boost Queue",
      summary: "推高能量和节奏感，适合短时冲刺。",
      type: "playlist" as const,
    };
  }

  return null;
}

function collectTrackPool(playlists: Playlist[], queue: Track[]) {
  const map = new Map<string, Track>();

  playlists.forEach((playlist) => {
    playlist.tracks.forEach((track) => map.set(track.id, track));
  });

  queue.forEach((track) => map.set(track.id, track));
  return [...map.values()];
}

export function getAgentResponse(
  query: string,
  trackPool: Track[],
): AgentResponse {
  const trimmedQuery = query.trim();
  const preset = resolvePreset(trimmedQuery);

  if (preset) {
    const desiredMood =
      trimmedQuery.startsWith("/chill")
        ? ["chill", "deep"]
        : trimmedQuery.startsWith("/focus")
          ? ["focus", "deep"]
          : ["boost"];

    return {
      ...preset,
      tracks: trackPool.filter((track) => desiredMood.includes(track.mood)),
    };
  }

  if (!trimmedQuery) {
    return {
      type: "system",
      title: "Agent Ready",
      summary: "输入 /focus、/chill、/boost 或自然语言关键词快速改写队列。",
      tracks: trackPool.slice(0, 4),
    };
  }

  const rankedTracks = [...trackPool]
    .map((track) => ({
      track,
      score: scoreTrack(track, trimmedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.track);

  if (!rankedTracks.length) {
    return {
      type: "search",
      title: `没有直接命中 "${trimmedQuery}"`,
      summary: "Agent 保留当前队列不变。试试 /focus 或直接输入风格、艺人、情绪。",
      tracks: trackPool.slice(0, 3),
    };
  }

  return {
    type: "search",
    title: `匹配 ${rankedTracks.length} 首结果`,
    summary: `Agent 根据 "${trimmedQuery}" 重新整理了候选队列。`,
    tracks: rankedTracks.slice(0, 6),
  };
}

export function useAgent() {
  const agentQuery = useQuaverStore((state) => state.agentQuery);
  const playlists = useQuaverStore((state) => state.playlists);
  const queue = useQuaverStore((state) => state.queue);
  const setAgentQuery = useQuaverStore((state) => state.setAgentQuery);
  const deferredQuery = useDeferredValue(agentQuery);
  const trackPool = collectTrackPool(playlists, queue);
  const preview = getAgentResponse(deferredQuery, trackPool);

  function handleInput(query: string) {
    setAgentQuery(query);
  }

  function submitAgentQuery(query = agentQuery) {
    return getAgentResponse(query, trackPool);
  }

  return {
    agentQuery,
    preview,
    handleInput,
    submitAgentQuery,
  };
}
