import { motion } from "framer-motion";
import { useQuaverStore } from "../../store/useQuaverStore";
import LibraryPlaylistSection from "./LibraryPlaylistSection";
import LibraryQueueSection from "./LibraryQueueSection";

export default function WorkspaceSidebar() {
  const workspaceView = useQuaverStore((state) => state.workspaceView);
  const playlists = useQuaverStore((state) => state.playlists);
  const queue = useQuaverStore((state) => state.queue);
  const setCanvasView = useQuaverStore((state) => state.setCanvasView);
  const setWorkspaceView = useQuaverStore((state) => state.setWorkspaceView);
  const navItems = [
    {
      id: "library" as const,
      title: "Library",
      label: "Records",
      detail: `${playlists.length} playlists`,
      accent: "from-emerald-300/22 via-cyan-300/12 to-white/[0.04]",
    },
    {
      id: "agent" as const,
      title: "Agent",
      label: "Copilot",
      detail: `${queue.length} queued`,
      accent: "from-cyan-300/20 via-amber-200/12 to-white/[0.04]",
    },
  ];

  return (
    <aside className="relative z-20 flex w-full flex-col overflow-hidden border-white/[0.06] bg-[#070807]/88 px-4 py-4 shadow-[18px_0_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl lg:h-full lg:w-[300px] lg:border-r lg:px-4 lg:py-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_30%_0%,rgba(29,185,84,0.2),transparent_58%)]" />
        <div className="absolute -left-20 bottom-24 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent lg:hidden" />
        <div className="absolute inset-y-5 right-0 hidden w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent lg:block" />
      </div>

      <section className="sonic-panel mb-5 rounded-[30px] p-3">
        <div className="relative flex items-center justify-between px-2 pt-1">
          <div>
            <p className="section-eyebrow">Quaver OS</p>
            <h1 className="chromatic-title mt-1 text-2xl font-bold tracking-[-0.04em]">
              Control Deck
            </h1>
          </div>
          <div className="mini-eq" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {navItems.map((item) => {
            const isActive = workspaceView === item.id;

            return (
              <motion.button
                layout
                key={item.id}
                type="button"
                onClick={() => {
                  setWorkspaceView(item.id);
                  if (item.id === "library") {
                    setCanvasView("browse");
                  }
                }}
                className={`kinetic-card group rounded-[24px] px-3 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                  isActive
                    ? `bg-gradient-to-br ${item.accent} text-white shadow-[0_18px_38px_rgba(29,185,84,0.14)]`
                    : "text-white/72 hover:text-white"
                }`}
              >
                <div className="relative">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/38">
                    {item.label}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold tracking-tight">{item.title}</p>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.72)]" : "bg-white/20"
                      }`}
                    />
                  </div>
                  <p className="mt-2 truncate text-[11px] text-white/46">{item.detail}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <LibraryPlaylistSection />
      <LibraryQueueSection />
    </aside>
  );
}
