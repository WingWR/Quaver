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
      className="relative z-40 bg-[#111111]/88 px-4 py-4 backdrop-blur-2xl md:px-6 lg:h-[90px] lg:py-0"
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <motion.div
        layout
        className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:gap-5"
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
