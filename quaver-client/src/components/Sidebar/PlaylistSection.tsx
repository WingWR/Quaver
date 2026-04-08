import { motion } from "framer-motion";
import { useQuaverStore } from "../../store/useQuaverStore";

export default function PlaylistSection() {
  const playlists = useQuaverStore((state) => state.playlists);
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const setSelectedPlaylist = useQuaverStore((state) => state.setSelectedPlaylist);

  return (
    <section className="flex min-h-0 flex-col lg:flex-1">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-grey">Library</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">保存的歌单</h2>
        </div>
        <div className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] text-brand-grey">
          {playlists.length} Lists
        </div>
      </div>

      <div className="scrollbar-brand max-h-[190px] space-y-2 overflow-y-auto pr-1 lg:max-h-none">
        {playlists.map((playlist) => {
          const isActive = playlist.id === selectedPlaylistId;

          return (
            <motion.button
              layout
              key={playlist.id}
              type="button"
              onClick={() => setSelectedPlaylist(playlist.id)}
              className={`group relative w-full overflow-hidden rounded-[28px] px-4 py-4 text-left transition ${
                isActive
                  ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] shadow-[0_16px_40px_rgba(0,0,0,0.34)]"
                  : "bg-white/[0.025] hover:bg-white/[0.045]"
              }`}
            >
              {isActive ? (
                <motion.div
                  layoutId="active-playlist-pill"
                  className="absolute inset-0 rounded-[28px] bg-[linear-gradient(135deg,rgba(29,185,84,0.14),rgba(255,255,255,0.05),rgba(0,0,0,0))]"
                />
              ) : null}
              <div className="absolute inset-[1px] rounded-[27px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))]" />
              <div className="relative flex items-center gap-3">
                <img
                  src={playlist.cover}
                  alt={playlist.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{playlist.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-brand-grey">
                    {playlist.description}
                  </p>
                  {playlist.ownerName ? (
                    <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/32">
                      {playlist.ownerName}
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
