import { motion } from "framer-motion";
import { useState } from "react";
import TrackActionsMenu from "../ContextMenu/TrackActionsMenu";
import { usePlaybackControllerRuntime } from "../../hooks/usePlaybackControllerRuntime";
import { useQuaverStore } from "../../store/useQuaverStore";
import type { Track } from "../../types/music";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export default function LibraryQueueSection() {
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const library = useQuaverStore((state) => state.library);
  const playlists = useQuaverStore((state) => state.playlists);
  const { playQueueTrack, moveQueueTrackToFront, removeQueueTrack, addTrackToPlaylist } =
    usePlaybackControllerRuntime();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: Track;
  } | null>(null);

  return (
    <section className="mt-5 flex h-[220px] min-h-0 flex-col border-t border-white/[0.06] pt-5 lg:h-[40%] lg:min-h-[240px]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="section-eyebrow">Queue</p>
          <h3 className="chromatic-title mt-1 text-lg font-bold tracking-[-0.04em]">
            Playback queue
          </h3>
        </div>
        <span className="metric-chip rounded-full px-3 py-1 text-[11px] text-white/58">
          {queue.length ? "Live" : "Empty"}
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
                whileHover={{ x: 3 }}
                type="button"
                onClick={() => void playQueueTrack(track, index)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setContextMenu({
                    x: event.clientX,
                    y: event.clientY,
                    track,
                  });
                }}
                className={`kinetic-card w-full rounded-2xl px-3 py-2.5 text-left transition duration-300 ${
                  isCurrent
                    ? "border-emerald-200/18 bg-[linear-gradient(135deg,rgba(29,185,84,0.2),rgba(103,232,249,0.06),rgba(255,255,255,0.035))] shadow-[0_12px_32px_rgba(29,185,84,0.1)]"
                    : "hover:border-white/[0.12] hover:bg-white/[0.045]"
                }`}
              >
                <div className="relative flex items-center gap-3">
                  <div className="relative shrink-0">
                    {isCurrent ? (
                      <span
                        className="absolute -inset-1 rounded-[18px] opacity-60 blur-md"
                        style={{ background: track.accent }}
                      />
                    ) : null}
                    <img
                      src={track.artwork}
                      alt={track.title}
                      className="relative h-11 w-11 rounded-[16px] border border-white/[0.1] object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`truncate text-sm font-semibold ${
                          isCurrent ? "text-emerald-200" : "text-white"
                        }`}
                      >
                        {track.title}
                      </p>
                      {isCurrent ? (
                        <span className="mini-eq shrink-0" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-white/46">{track.artist}</p>
                  </div>
                  <span className="text-xs font-medium text-white/42">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="sonic-panel flex flex-1 items-center rounded-[28px] border-dashed px-4 py-5">
          <div className="relative">
            <p className="text-sm font-medium text-white">Queue is empty</p>
            <p className="mt-2 text-sm leading-6 text-white/52">
              {library.message ??
                "Play a track or add one from search to build the queue for this session."}
            </p>
          </div>
        </div>
      )}
      <TrackActionsMenu
        menu={contextMenu}
        playlists={playlists}
        onClose={() => setContextMenu(null)}
        onPlayNext={moveQueueTrackToFront}
        onAddToPlaylist={addTrackToPlaylist}
        onRemoveFromQueue={removeQueueTrack}
        queueMode
      />
    </section>
  );
}
