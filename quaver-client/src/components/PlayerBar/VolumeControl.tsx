import { motion } from "framer-motion";

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M11 5L6.5 9H3V15H6.5L11 19V5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 9.5C16.8333 10.8333 16.8333 13.1667 15.5 14.5" strokeLinecap="round" />
      <path d="M18.5 7C21.1667 9.66667 21.1667 14.3333 18.5 17" strokeLinecap="round" />
    </svg>
  );
}

export default function VolumeControl({
  volume,
  onVolumeChange,
}: {
  volume: number;
  onVolumeChange: (value: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex h-full items-center gap-3 rounded-[24px] border border-white/10 bg-black/[0.22] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <button
        type="button"
        onClick={() => onVolumeChange(volume > 0 ? 0 : 72)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.055] text-white/[0.78] transition hover:bg-white/[0.11] hover:text-white"
        aria-label="Toggle mute"
        title="Toggle mute"
      >
        <VolumeIcon />
      </button>
      <div className="relative w-28 py-1">
        <div className="absolute inset-y-1/2 left-0 right-0 h-[5px] -translate-y-1/2 rounded-full bg-white/[0.105]" />
        <div
          className="absolute inset-y-1/2 left-0 h-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#fbbf24,#34d399,#38bdf8)] shadow-[0_0_18px_rgba(52,211,153,0.18)]"
          style={{ width: `${volume}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className="player-slider relative z-10 h-4 w-full cursor-pointer appearance-none bg-transparent"
          aria-label="Volume"
        />
      </div>
      <span className="hidden w-9 text-right text-xs tabular-nums text-white/[0.44] sm:inline">
        {volume}%
      </span>
    </motion.div>
  );
}
