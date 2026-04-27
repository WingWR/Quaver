import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import TrackActionsMenu from "../../../components/ContextMenu/TrackActionsMenu";
import { usePlaybackControllerRuntime } from "../../../hooks/usePlaybackControllerRuntime";
import { useQuaverStore } from "../../../store/useQuaverStore";
import type { Track } from "../../../types/music";
import { useAgentTrackSearch } from "../hooks/useAgentTrackSearch";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L21 21" strokeLinecap="round" />
    </svg>
  );
}

function ResultMeta({ track }: { track: Track }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-white">{track.title}</p>
      <p className="truncate text-xs text-brand-grey">
        {track.artist} · {track.album}
      </p>
    </div>
  );
}

export default function TrackSearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number>();
  const playlists = useQuaverStore((state) => state.playlists);
  const {
    playTrackList,
    queueTrackNext,
    queueTrackLater,
    addTrackToPlaylist,
  } = usePlaybackControllerRuntime();
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    status,
    results,
    message,
    lastQuery,
    hasMore,
    resultCountLabel,
    submitSearch,
    loadMoreSearch,
    clearSearch,
  } = useAgentTrackSearch();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: Track;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (!isOpen) {
      return;
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, setIsOpen]);

  return (
    <motion.div layout className="relative z-[80] flex items-center justify-end">
      <AnimatePresence mode="popLayout" initial={false}>
        {isOpen ? (
          <motion.div
            key="search-input"
            layout
            layoutId="player-search-shell"
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-[85] flex w-full items-center gap-3 rounded-[22px] border border-white/[0.12] bg-black/[0.72] px-4 py-3 shadow-[0_22px_64px_rgba(0,0,0,0.48)] ring-1 ring-white/[0.03] backdrop-blur-2xl md:w-[24rem] md:max-w-[42vw]"
          >
            <SearchIcon />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setIsOpen(true)}
              onBlur={() => {
                blurTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 140);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submitSearch(query, 0, false);
                }
              }}
              placeholder="Search a track or artist"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-brand-grey"
            />

            {query ? (
              <button
                type="button"
                onClick={() => clearSearch()}
                className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs text-white/[0.72] transition hover:bg-white/[0.12] hover:text-white"
              >
                Clear
              </button>
            ) : null}

            <div
              className="absolute bottom-[calc(100%+14px)] right-0 z-[90] w-full rounded-[24px] border border-white/[0.12] bg-black/[0.82] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.58)] ring-1 ring-white/[0.03] backdrop-blur-2xl md:w-[24rem]"
              onMouseDown={(event) => {
                event.preventDefault();
                if (blurTimeoutRef.current) {
                  window.clearTimeout(blurTimeoutRef.current);
                }
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-grey">
                    Track Search
                  </p>
                  <h4 className="mt-2 text-sm font-semibold text-white">{resultCountLabel}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => void submitSearch(query, 0, false)}
                  className="rounded-full border border-cyan-200/[0.24] bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(56,189,248,0.14))] px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-100/[0.36]"
                >
                  Search
                </button>
              </div>

              <div className="scrollbar-brand mt-4 max-h-[32rem] overflow-y-auto pr-1">
                {status === "loading" ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-3 py-3"
                      >
                        <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-3 w-32 rounded-full bg-white/[0.08]" />
                          <div className="h-3 w-24 rounded-full bg-white/[0.06]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length ? (
                  <div className="space-y-2">
                    {results.map((track, index) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => void playTrackList([track], 0, `search-track-${track.id}`)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            track,
                          });
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2 text-left transition hover:bg-white/[0.08]"
                      >
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <ResultMeta track={track} />
                      </button>
                    ))}
                    {hasMore ? (
                      <button
                        type="button"
                        onClick={() => void loadMoreSearch()}
                        className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-center text-xs font-medium text-white/78 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        Load more
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5">
                    <p className="text-sm font-medium text-white">
                      {status === "error"
                        ? "Search is temporarily unavailable"
                        : lastQuery
                          ? "No matching tracks yet"
                          : "Search is ready"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-brand-grey">
                      {message ?? "Search by track name, artist, or a short natural-language song request."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="search-button"
            layout
            layoutId="player-search-shell"
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, x: 16, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.11] hover:text-white"
          >
            <SearchIcon />
            <span className="hidden text-sm font-medium md:inline">Search</span>
          </motion.button>
        )}
      </AnimatePresence>

      <TrackActionsMenu
        menu={contextMenu}
        playlists={playlists}
        onClose={() => setContextMenu(null)}
        onPlayNext={queueTrackNext}
        onAddToQueue={queueTrackLater}
        onAddToPlaylist={addTrackToPlaylist}
      />
    </motion.div>
  );
}
