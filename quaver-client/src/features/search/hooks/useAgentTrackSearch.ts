import { useEffect, useMemo, useRef, useState } from "react";
import { formatBackendError, getBackendRetryAfterSeconds, isBackendRateLimitError } from "../../../api/http";
import { appConfig } from "../../../config/app";
import { useQuaverStore } from "../../../store/useQuaverStore";
import { useUiStore } from "../../../store/useUiStore";
import { searchTracksWithAgent } from "../api/client";
import type { AgentTrackSearchResponse } from "../api/types";

type SearchStatus = "idle" | "loading" | "ready" | "empty" | "error";

const SEARCH_PAGE_SIZE = 8;
const SEARCH_UNAVAILABLE_MESSAGE =
  "Search backend is not ready. The search box stays available, but results will appear after the backend is connected.";

export function useAgentTrackSearch() {
  const pushNotice = useUiStore((state) => state.pushNotice);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<AgentTrackSearchResponse["tracks"]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  async function submitSearch(nextQuery = query, offset = 0, append = false) {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) {
      setResults([]);
      setStatus("idle");
      setMessage(null);
      setLastQuery("");
      setRequestId(null);
      setNextOffset(0);
      setHasMore(false);
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
          limit: SEARCH_PAGE_SIZE,
          offset,
          metadata: {
            scope: "track_search",
            workspace: "player_bar",
          },
        },
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      setResults((currentResults) => {
        if (!append) {
          return response.tracks;
        }

        const seen = new Set(currentResults.map((track) => track.spotifyId ?? track.id));
        return [
          ...currentResults,
          ...response.tracks.filter((track) => {
            const key = track.spotifyId ?? track.id;
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          }),
        ];
      });
      setRequestId(response.requestId ?? null);
      setStatus(response.status === "error" ? "error" : append || response.tracks.length ? "ready" : "empty");
      setHasMore(Boolean(response.hasMore));
      setNextOffset(offset + (response.limit ?? SEARCH_PAGE_SIZE));
      setMessage(
        response.tracks.length
          ? null
          : response.message ?? "No matching tracks were returned.",
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const nextMessage = isBackendRateLimitError(error)
        ? (() => {
            const retryAfterSeconds = getBackendRetryAfterSeconds(error);
            return retryAfterSeconds == null
              ? "Spotify search is a little busy right now. Please retry in a moment."
              : `Spotify search is a little busy right now. Please retry in ${retryAfterSeconds} seconds.`;
          })()
        : formatBackendError(error, SEARCH_UNAVAILABLE_MESSAGE);
      setResults([]);
      setRequestId(null);
      setNextOffset(0);
      setHasMore(false);
      setStatus("error");
      setMessage(nextMessage);
      if (!isBackendRateLimitError(error)) {
        pushNotice({
          message: nextMessage,
          variant: "warning",
          dedupeKey: "agent-track-search",
        });
      }
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
    setNextOffset(0);
    setHasMore(false);
  }

  async function loadMoreSearch() {
    if (!lastQuery || status === "loading" || !hasMore) {
      return;
    }

    await submitSearch(lastQuery, nextOffset, true);
  }

  const resultCountLabel = useMemo(() => {
    if (status === "loading") {
      return "Searching";
    }

    if (status === "ready") {
      return hasMore ? `${results.length}+ results` : `${results.length} results`;
    }

    if (status === "empty") {
      return "No results";
    }

    if (status === "error") {
      return "Backend unavailable";
    }

    return "Advanced search";
  }, [hasMore, results.length, status]);

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
    hasMore,
    resultCountLabel,
    submitSearch,
    loadMoreSearch,
    clearSearch,
  };
}
