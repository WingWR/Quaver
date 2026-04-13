import { motion } from "framer-motion";
import { usePlaybackControllerRuntime } from "../../hooks/usePlaybackControllerRuntime";
import { useQuaverStore } from "../../store/useQuaverStore";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default function LibraryQueueSection() {
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const library = useQuaverStore((state) => state.library);
  const { playQueueTrack } = usePlaybackControllerRuntime();

  return (
    <section className="mt-5 flex h-[220px] min-h-0 flex-col border-t border-white/[0.04] pt-5 lg:h-[40%] lg:min-h-[240px]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-grey">Queue</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">播放队列</h3>
        </div>
        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-brand-grey">
          Live
        </span>
      </div>

      {queue.length ? (
        <div className="scrollbar-brand flex-1 space-y-2 overflow-y-auto pr-1">
          {queue.map((track, index) => {
            const isCurrent = index === currentTrackIndex;

            return (
              <motion.button
                layout
                key={`${track.id}-${index}`}
                type="button"
                onClick={() => void playQueueTrack(track, index)}
                className={`w-full rounded-2xl px-3 py-2.5 text-left transition ${
                  isCurrent
                    ? "bg-[linear-gradient(135deg,rgba(29,185,84,0.18),rgba(255,255,255,0.04))] shadow-[0_10px_28px_rgba(0,0,0,0.24)]"
                    : "bg-white/[0.025] hover:bg-white/[0.045]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={track.artwork}
                    alt={track.title}
                    className="h-11 w-11 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        isCurrent ? "text-spotify-green" : "text-white"
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="truncate text-xs text-brand-grey">{track.artist}</p>
                  </div>
                  <span className="text-xs text-brand-grey">{formatDuration(track.duration)}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 items-center rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-5">
          <div>
            <p className="text-sm font-medium text-white">当前没有播放队列</p>
            <p className="mt-2 text-sm leading-6 text-brand-grey">
              {library.message ?? "后端接入后，这里会显示实时队列。"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
