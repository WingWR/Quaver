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
      className="flex h-full items-center gap-3"
    >
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-white/80 transition hover:bg-white/[0.09] hover:text-white"
      >
        <VolumeIcon />
      </button>
      <div className="relative w-28 py-1">
        <div className="absolute inset-y-1/2 left-0 right-0 h-[4px] -translate-y-1/2 rounded-full bg-white/[0.09]" />
        <div
          className="absolute inset-y-1/2 left-0 h-[4px] -translate-y-1/2 rounded-full bg-white/70"
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
    </motion.div>
  );
}
