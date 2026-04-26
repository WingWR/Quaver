import { motion } from "framer-motion";
import { useEffect } from "react";
import TrackSearchBar from "../../features/search/components/TrackSearchBar";
import { usePlaybackControllerRuntime } from "../../hooks/usePlaybackControllerRuntime";
import { useQuaverStore } from "../../store/useQuaverStore";
import PlaybackControls from "./PlaybackControls";
import TrackInfo from "./TrackInfo";
import VolumeControl from "./VolumeControl";

export default function PlayerBar() {
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const currentTrack = queue[currentTrackIndex];
  const isPlaying = useQuaverStore((state) => state.isPlaying);
  const progress = useQuaverStore((state) => state.progress);
  const volume = useQuaverStore((state) => state.volume);
  const setProgress = useQuaverStore((state) => state.setProgress);
  const playbackSource = useQuaverStore((state) => state.playbackSource);
  const setCanvasView = useQuaverStore((state) => state.setCanvasView);
  const {
    togglePlayback,
    playNext,
    playPrevious,
    seek,
    updateVolume,
    isShuffleEnabled,
    repeatMode,
    toggleShuffleMode,
    cycleRepeatMode,
  } = usePlaybackControllerRuntime();
  const accentColor = currentTrack?.accent ?? "#34d399";

  useEffect(() => {
    if (!isPlaying || !currentTrack || playbackSource !== "backend") {
      return;
    }

    const timer = window.setInterval(() => {
      const nextProgress = progress + 1;

      if (nextProgress >= currentTrack.duration) {
        playNext();
        return;
      }

      setProgress(nextProgress);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentTrack, isPlaying, playbackSource, playNext, progress, setProgress]);

  return (
    <motion.footer
      layout
      className="relative z-40 overflow-visible border-t border-white/10 bg-black/[0.58] px-3 py-3 shadow-[0_-28px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl md:px-6 lg:h-[112px] lg:py-0"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          key={accentColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.74 }}
          transition={{ duration: 0.45 }}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${accentColor}38 0%, rgba(56,189,248,0.18) 34%, rgba(244,114,182,0.14) 68%, rgba(251,191,36,0.12) 100%)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.72))]" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
      <motion.div
        layout
        className="relative mx-auto flex h-full max-w-[102rem] flex-col gap-4 lg:flex-row lg:items-center lg:gap-5"
      >
        <div className="min-w-0 lg:flex-[0.95]">
          <TrackInfo track={currentTrack} onOpenLyrics={() => setCanvasView("lyrics")} />
        </div>

        <div className="flex min-w-0 justify-center lg:flex-[1.35]">
          <PlaybackControls
            track={currentTrack}
            progress={progress}
            isPlaying={isPlaying}
            onSeek={(value) => void seek(value)}
            onTogglePlayback={() => void togglePlayback()}
            onPlayNext={() => void playNext()}
            onPlayPrevious={() => void playPrevious()}
            isShuffleEnabled={isShuffleEnabled}
            repeatMode={repeatMode}
            onToggleShuffle={() => void toggleShuffleMode()}
            onCycleRepeatMode={() => void cycleRepeatMode()}
          />
        </div>

        <motion.div
          layout
          className="flex w-full flex-wrap items-center justify-between gap-4 lg:flex-[1.05] lg:flex-nowrap lg:justify-end"
        >
          <TrackSearchBar />
          <VolumeControl
            volume={volume}
            onVolumeChange={(nextVolume) => void updateVolume(nextVolume)}
          />
        </motion.div>
      </motion.div>
    </motion.footer>
  );
}
