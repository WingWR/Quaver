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
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-white/6" />
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-white/8" />
          <div className="h-3 w-20 rounded-full bg-white/6" />
        </div>
      </div>
    );
  }

  const canOpenLyrics = track.source === "spotify";

  return (
    <motion.div layout className="flex min-w-0 items-center gap-4">
      <motion.button
        layout
        type="button"
        onClick={onOpenLyrics}
        disabled={!canOpenLyrics}
        className="group relative overflow-hidden rounded-2xl disabled:cursor-default"
      >
        <motion.img
          layoutId={`artwork-${track.id}`}
          src={track.artwork}
          alt={track.title}
          className={`h-14 w-14 rounded-2xl object-cover transition duration-300 ${
            canOpenLyrics ? "group-hover:scale-[1.03]" : ""
          }`}
        />
        <span
          className={`absolute inset-x-1 bottom-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/88 transition ${
            canOpenLyrics ? "opacity-0 group-hover:opacity-100" : "hidden"
          }`}
        >
          Lyrics
        </span>
      </motion.button>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{track.title}</p>
        <p className="truncate text-sm text-brand-grey">
          {track.artist} · {track.album}
        </p>
      </div>
    </motion.div>
  );
}
