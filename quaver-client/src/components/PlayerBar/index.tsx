import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useAgent } from "../../hooks/useAgent";
import { usePlaybackController } from "../../hooks/usePlaybackController";
import { useQuaverStore } from "../../store/useQuaverStore";
import AgentSearchContainer from "./AgentSearchContainer";
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
  const isAgentActive = useQuaverStore((state) => state.isAgentActive);
  const toggleAgent = useQuaverStore((state) => state.toggleAgent);
  const setProgress = useQuaverStore((state) => state.setProgress);
  const playbackSource = useQuaverStore((state) => state.playbackSource);
  const setCanvasView = useQuaverStore((state) => state.setCanvasView);
  const { agentQuery, preview, handleInput, submitAgentQuery } = useAgent();
  const {
    togglePlayback,
    playNext,
    playPrevious,
    seek,
    updateVolume,
    playTrackList,
    isShuffleEnabled,
    repeatMode,
    toggleShuffleMode,
    cycleRepeatMode,
  } = usePlaybackController();

  useEffect(() => {
    if (!isPlaying || !currentTrack || playbackSource !== "mock") {
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

  async function applyAgentResult(query?: string) {
    const response = submitAgentQuery(query);
    if (response.tracks.length) {
      await playTrackList(response.tracks, 0);
    }
  }

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
            isAgentActive={isAgentActive}
          />
        </div>

        <motion.div
          layout
          className="flex w-full flex-wrap items-center justify-between gap-4 lg:flex-[1.05] lg:flex-nowrap lg:justify-end"
        >
          <AnimatePresence initial={false}>
            {!isAgentActive ? (
              <VolumeControl
                key="volume"
                volume={volume}
                onVolumeChange={(nextVolume) => void updateVolume(nextVolume)}
              />
            ) : null}
          </AnimatePresence>

          <AgentSearchContainer
            isActive={isAgentActive}
            agentQuery={agentQuery}
            preview={preview}
            onToggle={toggleAgent}
            onChange={handleInput}
            onSubmit={applyAgentResult}
          />
        </motion.div>
      </motion.div>
    </motion.footer>
  );
}
