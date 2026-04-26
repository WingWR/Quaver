import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Track } from "../../types/music";

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.max(0, Math.floor(value % 60));
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function IconButton({
  children,
  onClick,
  className = "",
  isActive = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  isActive?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      type="button"
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 hover:bg-white/[0.11] hover:text-white ${
        isActive
          ? "border-cyan-200/[0.24] bg-[linear-gradient(135deg,rgba(52,211,153,0.22),rgba(56,189,248,0.14))] text-emerald-200"
          : "border-white/[0.08] bg-white/[0.055] text-white/[0.78]"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M16 3H21V8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20L10 14" strokeLinecap="round" />
      <path d="M15 9L21 3" strokeLinecap="round" />
      <path d="M4 4L11 11" strokeLinecap="round" />
      <path d="M14 14L17 17C17.6 17.6 18.4 18 19.2 18H21" strokeLinecap="round" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M6 5C6.55228 5 7 5.44772 7 6V18C7 18.5523 6.55228 19 6 19C5.44772 19 5 18.5523 5 18V6C5 5.44772 5.44772 5 6 5Z" />
      <path d="M17.9 5.3C18.2 5.7 18.1 6.3 17.7 6.6L11.9 11L17.7 15.4C18.1 15.7 18.2 16.3 17.9 16.7C17.6 17.1 17 17.2 16.6 16.9L9.7 11.8C9.2 11.4 9.2 10.6 9.7 10.2L16.6 5.1C17 4.8 17.6 4.9 17.9 5.3Z" />
    </svg>
  );
}

function PlayPauseIcon({ isPlaying }: { isPlaying: boolean }) {
  if (isPlaying) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M8 5C8.55228 5 9 5.44772 9 6V18C9 18.5523 8.55228 19 8 19C7.44772 19 7 18.5523 7 18V6C7 5.44772 7.44772 5 8 5Z" />
        <path d="M16 5C16.5523 5 17 5.44772 17 6V18C17 18.5523 16.5523 19 16 19C15.4477 19 15 18.5523 15 18V6C15 5.44772 15.4477 5 16 5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M8.5 5.47085C8.5 4.65009 9.41917 4.17348 10.084 4.6393L18.3596 10.4444C18.9236 10.8401 18.9236 11.6753 18.3596 12.0709L10.084 17.876C9.41917 18.3418 8.5 17.8652 8.5 17.0445V5.47085Z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M18 5C18.5523 5 19 5.44772 19 6V18C19 18.5523 18.5523 19 18 19C17.4477 19 17 18.5523 17 18V6C17 5.44772 17.4477 5 18 5Z" />
      <path d="M6.1 5.3C5.8 5.7 5.9 6.3 6.3 6.6L12.1 11L6.3 15.4C5.9 15.7 5.8 16.3 6.1 16.7C6.4 17.1 7 17.2 7.4 16.9L14.3 11.8C14.8 11.4 14.8 10.6 14.3 10.2L7.4 5.1C7 4.8 6.4 4.9 6.1 5.3Z" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M17 2L21 6L17 10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9C3 7.34315 4.34315 6 6 6H21" strokeLinecap="round" />
      <path d="M7 22L3 18L7 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13V15C21 16.6569 19.6569 18 18 18H3" strokeLinecap="round" />
    </svg>
  );
}

export default function PlaybackControls({
  track,
  progress,
  isPlaying,
  onSeek,
  onTogglePlayback,
  onPlayNext,
  onPlayPrevious,
  isShuffleEnabled,
  repeatMode,
  onToggleShuffle,
  onCycleRepeatMode,
}: {
  track?: Track;
  progress: number;
  isPlaying: boolean;
  onSeek: (value: number) => void;
  onTogglePlayback: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  isShuffleEnabled: boolean;
  repeatMode: "off" | "context" | "track";
  onToggleShuffle: () => void;
  onCycleRepeatMode: () => void;
}) {
  const duration = track?.duration ?? 0;
  const progressPercent = duration ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  return (
    <motion.div
      layout
      className="flex h-full min-w-0 max-w-[46rem] flex-1 flex-col justify-center rounded-[28px] border border-white/10 bg-black/[0.24] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <IconButton onClick={onToggleShuffle} isActive={isShuffleEnabled}>
          <ShuffleIcon />
        </IconButton>
        <IconButton onClick={onPlayPrevious}>
          <PreviousIcon />
        </IconButton>
        <IconButton
          onClick={onTogglePlayback}
          className="h-12 w-12 border-white/25 bg-[linear-gradient(135deg,#f8fafc,#a7f3d0_36%,#67e8f9_70%,#f9a8d4)] text-black shadow-[0_14px_34px_rgba(103,232,249,0.22)] hover:bg-white"
        >
          <PlayPauseIcon isPlaying={isPlaying} />
        </IconButton>
        <IconButton onClick={onPlayNext}>
          <NextIcon />
        </IconButton>
        <IconButton
          onClick={onCycleRepeatMode}
          isActive={repeatMode !== "off"}
          className="relative"
        >
          <RepeatIcon />
          {repeatMode === "track" ? (
            <span className="absolute -bottom-0.5 right-2 text-[9px] font-semibold">1</span>
          ) : null}
        </IconButton>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="w-10 text-right text-xs tabular-nums text-white/[0.48]">
          {formatTime(progress)}
        </span>
        <div className="relative flex-1 py-1">
          <div className="absolute inset-y-1/2 left-0 right-0 h-[5px] -translate-y-1/2 rounded-full bg-white/[0.105]" />
          <div
            className="absolute inset-y-1/2 left-0 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8,#f472b6,#fbbf24)] shadow-[0_0_20px_rgba(56,189,248,0.22)]"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            value={Math.min(progress, duration || 0)}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="player-slider relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent"
            aria-label="Seek"
          />
        </div>
        <span className="w-10 text-xs tabular-nums text-white/[0.48]">
          {formatTime(duration)}
        </span>
      </div>
    </motion.div>
  );
}
