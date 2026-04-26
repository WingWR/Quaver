import { useEffect, useMemo, useRef, useState } from "react";
import { formatBackendError } from "../../../api/http";
import { appConfig } from "../../../config/app";
import { useQuaverStore } from "../../../store/useQuaverStore";
import { useUiStore } from "../../../store/useUiStore";
import { searchTracksWithAgent } from "../api/client";
import type { AgentTrackSearchResponse } from "../api/types";

type SearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

const SEARCH_UNAVAILABLE_MESSAGE =
  "Search backend is not ready. The search box stays available, but results will appear after the backend is connected.";

export function useAgentTrackSearch() {
  const playlists = useQuaverStore((state) => state.playlists);
  const queue = useQuaverStore((state) => state.queue);
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const pushNotice = useUiStore((state) => state.pushNotice);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<AgentTrackSearchResponse["tracks"]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  async function submitSearch(nextQuery = query) {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) {
      setResults([]);
      setStatus("idle");
      setMessage(null);
      setLastQuery("");
      setRequestId(null);
      return;
    }

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setIsOpen(true);
    setStatus("loading");
    setMessage(null);
    setLastQuery(trimmedQuery);

    try {
      const response = await searchTracksWithAgent(
        {
          query: trimmedQuery,
          model: appConfig.agent.searchModel,
          limit: 8,
          selectedPlaylistId,
          playlistIds: playlists.map((playlist) => playlist.id),
          queueTrackIds: queue.map((track) => track.id),
          metadata: {
            scope: "music_search",
            workspace: "player_bar",
          },
        },
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      setResults(response.tracks);
      setRequestId(response.requestId ?? null);
      setStatus(response.status === "error" ? "error" : response.tracks.length ? "ready" : "empty");
      setMessage(
        response.tracks.length
          ? null
          : response.message ?? "No matching tracks were returned.",
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const nextMessage = formatBackendError(error, SEARCH_UNAVAILABLE_MESSAGE);
      setResults([]);
      setRequestId(null);
      setStatus("error");
      setMessage(nextMessage);
      pushNotice({
        message: nextMessage,
        variant: "warning",
        dedupeKey: "agent-track-search",
      });
    }
  }

  function clearSearch() {
    activeRequestRef.current?.abort();
    setQuery("");
    setResults([]);
    setStatus("idle");
    setMessage(null);
    setLastQuery("");
    setRequestId(null);
  }

  const resultCountLabel = useMemo(() => {
    if (status === "loading") {
      return "Searching";
    }

    if (status === "ready") {
      return `${results.length} results`;
    }

    if (status === "empty") {
      return "No results";
    }

    if (status === "error") {
      return "Backend unavailable";
    }

    return "Advanced search";
  }, [results.length, status]);

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    status,
    results,
    message,
    lastQuery,
    requestId,
    resultCountLabel,
    submitSearch,
    clearSearch,
  };
}
