import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Playlist, Track } from "../../types/music";

interface MenuState {
  x: number;
  y: number;
  track: Track;
}

export default function TrackActionsMenu({
  menu,
  playlists,
  onClose,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
}: {
  menu: MenuState | null;
  playlists: Playlist[];
  onClose: () => void;
  onPlayNext: (track: Track) => void | Promise<void>;
  onAddToQueue: (track: Track) => void | Promise<void>;
  onAddToPlaylist: (playlist: Playlist, track: Track) => void | Promise<void>;
}) {
  useEffect(() => {
    if (!menu) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menu, onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {menu ? (
        <div className="fixed inset-0 z-[190]" onContextMenu={(event) => event.preventDefault()}>
          <div
            className="absolute inset-0"
            onMouseDown={() => onClose()}
            onContextMenu={() => onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.16 }}
            className="absolute z-[200] min-w-[240px] overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#151515] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.46)] ring-1 ring-black/50"
            style={{
              left: Math.min(menu.x, window.innerWidth - 272),
              top: Math.min(menu.y, window.innerHeight - 360),
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="border-b border-white/[0.05] px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">{menu.track.title}</p>
              <p className="truncate text-xs text-brand-grey">{menu.track.artist}</p>
            </div>

            <div className="space-y-1 px-1 py-2">
              <button
                type="button"
                onClick={() => {
                  void onPlayNext(menu.track);
                  onClose();
                }}
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/84 transition hover:bg-white/[0.06] hover:text-white"
              >
                Play next
              </button>
              <button
                type="button"
                onClick={() => {
                  void onAddToQueue(menu.track);
                  onClose();
                }}
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/84 transition hover:bg-white/[0.06] hover:text-white"
              >
                Add to queue
              </button>
            </div>

            <div className="border-t border-white/[0.05] px-1 py-2">
              <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.24em] text-brand-grey">
                Add to playlist
              </p>
              <div className="max-h-56 overflow-y-auto">
                {playlists.length ? (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => {
                        void onAddToPlaylist(playlist, menu.track);
                        onClose();
                      }}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/84 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      {playlist.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm leading-6 text-brand-grey">
                    No playlists are available for this user yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
