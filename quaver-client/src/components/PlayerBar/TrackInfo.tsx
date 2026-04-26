import { motion } from "framer-motion";
import type { Track } from "../../types/music";

export default function TrackInfo({
  track,
  onOpenLyrics,
}: {
  track?: Track;
  onOpenLyrics: () => void;
}) {
  if (!track) {
    return (
      <div className="flex min-w-0 items-center gap-4 rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-3">
        <div className="h-16 w-16 rounded-2xl bg-[linear-gradient(135deg,rgba(52,211,153,0.22),rgba(56,189,248,0.16),rgba(244,114,182,0.18))]" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-white">Queue is ready</p>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className="h-2 rounded-full bg-white/[0.16]"
                style={{ width: `${22 - index * 3}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const canOpenLyrics = track.source === "spotify";

  return (
    <motion.div
      layout
      className="flex min-w-0 items-center gap-4 rounded-[28px] border border-white/10 bg-black/[0.24] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <motion.button
        layout
        type="button"
        onClick={onOpenLyrics}
        disabled={!canOpenLyrics}
        className="group relative shrink-0 overflow-hidden rounded-2xl disabled:cursor-default"
      >
        <span
          className="absolute -inset-1 opacity-70 blur-lg"
          style={{ background: track.accent }}
        />
        <motion.img
          layoutId={`artwork-${track.id}`}
          src={track.artwork}
          alt={track.title}
          className={`relative h-16 w-16 rounded-2xl border border-white/[0.15] object-cover shadow-[0_16px_40px_rgba(0,0,0,0.38)] transition duration-300 ${
            canOpenLyrics ? "group-hover:scale-[1.03]" : ""
          }`}
        />
        <span
          className={`absolute inset-x-1 bottom-1 rounded-full bg-black/[0.55] px-1.5 py-0.5 text-[10px] font-medium text-white/[0.88] transition ${
            canOpenLyrics ? "opacity-0 group-hover:opacity-100" : "hidden"
          }`}
        >
          Lyrics
        </span>
      </motion.button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white md:text-[15px]">{track.title}</p>
        <p className="mt-1 truncate text-sm text-white/[0.52]">
          {track.artist} - {track.album}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          {[10, 18, 12, 22, 14].map((height, index) => (
            <motion.span
              key={index}
              className="w-1 rounded-full bg-[linear-gradient(180deg,#67e8f9,#f472b6)]"
              style={{ height }}
              animate={{ scaleY: [0.72, 1, 0.82] }}
              transition={{
                duration: 1.3 + index * 0.1,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
            />
          ))}
          <span className="ml-1 truncate text-[11px] font-medium uppercase tracking-[0.22em] text-white/[0.35]">
            {track.source}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
