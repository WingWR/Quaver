import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import TrackContextMenu from "../ContextMenu/TrackContextMenu";
import { usePlaybackController } from "../../hooks/usePlaybackController";
import { useQuaverStore } from "../../store/useQuaverStore";
import type { AgentResponse } from "../../types/music";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L21 21" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path
        d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AgentSearchContainer({
  isActive,
  agentQuery,
  preview,
  onToggle,
  onChange,
  onSubmit,
}: {
  isActive: boolean;
  agentQuery: string;
  preview: AgentResponse;
  onToggle: (nextState?: boolean) => void;
  onChange: (value: string) => void;
  onSubmit: (query?: string) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: AgentResponse["tracks"][number];
  } | null>(null);
  const playlists = useQuaverStore((state) => state.playlists);
  const { queueTrackNext, queueTrackLater, addTrackToPlaylist } = usePlaybackController();

  useEffect(() => {
    if (!isActive) {
      setIsPopoverOpen(false);
      return;
    }

    inputRef.current?.focus();
    setIsPopoverOpen(true);
  }, [isActive]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onToggle(false);
      }
    }

    if (isActive) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isActive, onToggle]);

  return (
    <motion.div layout className="relative z-[80] flex items-center justify-end">
      <AnimatePresence mode="popLayout" initial={false}>
        {isActive ? (
          <motion.div
            key="agent-input"
            layout
            layoutId="agent-shell"
            initial={{ opacity: 0, x: 36, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 28, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative z-[85] flex w-full items-center gap-3 rounded-[22px] border border-white/[0.08] bg-[#121212] px-4 py-3 shadow-[0_22px_64px_rgba(0,0,0,0.44)] ring-1 ring-black/40 md:w-[26rem] md:max-w-[46vw]"
          >
            <span className="agent-ready-dot h-2.5 w-2.5 rounded-full bg-spotify-green" />
            <SparkIcon />
            <input
              ref={inputRef}
              value={agentQuery}
              onChange={(event) => onChange(event.target.value)}
              onFocus={() => setIsPopoverOpen(true)}
              onBlur={() => {
                blurTimeoutRef.current = window.setTimeout(() => onToggle(false), 140);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                  onToggle(false);
                }
              }}
              placeholder="Ask Quaver Agent: /focus, /chill, 或自然语言"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-brand-grey"
            />

            <AnimatePresence>
              {isPopoverOpen ? (
                <motion.div
                  key="agent-popover"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute bottom-[calc(100%+14px)] right-0 z-[90] w-full rounded-[24px] border border-white/[0.08] bg-[#161616] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.54)] ring-1 ring-black/40 md:w-[26rem]"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    if (blurTimeoutRef.current) {
                      window.clearTimeout(blurTimeoutRef.current);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-brand-grey">
                        {preview.type}
                      </p>
                      <h4 className="mt-2 text-sm font-semibold text-white">
                        {preview.title}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSubmit();
                        onToggle(false);
                      }}
                      className="rounded-full border border-spotify-green/25 bg-spotify-green/10 px-3 py-1.5 text-xs font-medium text-spotify-green transition hover:bg-spotify-green/15"
                    >
                      Apply
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-brand-grey">{preview.summary}</p>

                  <div className="mt-4 space-y-2">
                    {preview.tracks.slice(0, 4).map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          onChange(track.title);
                          onSubmit(track.title);
                          onToggle(false);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            track,
                          });
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.035] px-3 py-2 text-left transition hover:bg-white/[0.07]"
                      >
                        <img
                          src={track.artwork}
                          alt={track.title}
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-brand-grey">
                            {track.artist} · {track.mood}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.button
            key="agent-button"
            layout
            layoutId="agent-shell"
            type="button"
            onClick={() => onToggle(true)}
            initial={{ opacity: 0, x: 20, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="flex h-11 items-center gap-2 rounded-full bg-white/[0.055] px-4 text-sm text-white/80 transition hover:bg-white/[0.09] hover:text-white"
          >
            <SearchIcon />
            <span className="hidden text-sm font-medium md:inline">Search / Agent</span>
          </motion.button>
        )}
      </AnimatePresence>

      <TrackContextMenu
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
