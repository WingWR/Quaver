import { motion } from "framer-motion";
import { useQuaverStore } from "../../store/useQuaverStore";
import LibraryPlaylistSection from "./LibraryPlaylistSection";
import LibraryQueueSection from "./LibraryQueueSection";

export default function WorkspaceSidebar() {
  const workspaceView = useQuaverStore((state) => state.workspaceView);
  const setCanvasView = useQuaverStore((state) => state.setCanvasView);
  const setWorkspaceView = useQuaverStore((state) => state.setWorkspaceView);

  return (
    <aside className="relative flex w-full flex-col bg-[#0d0d0d]/96 px-4 py-4 lg:h-full lg:w-[280px] lg:px-4 lg:py-5">
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent lg:hidden" />
      <div className="pointer-events-none absolute inset-y-4 right-0 hidden w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent lg:block" />

      <section className="mb-5 rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-3">
        <p className="px-2 text-xs uppercase tracking-[0.3em] text-brand-grey">Workspace</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <motion.button
            layout
            type="button"
            onClick={() => {
              setWorkspaceView("library");
              setCanvasView("browse");
            }}
            className={`rounded-[22px] px-3 py-3 text-left transition ${
              workspaceView === "library"
                ? "bg-[linear-gradient(135deg,rgba(29,185,84,0.18),rgba(255,255,255,0.05))] text-white"
                : "bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <p className="text-sm font-medium">Library</p>
            <p className="mt-1 text-xs text-white/60">Tracks and queue</p>
          </motion.button>

          <motion.button
            layout
            type="button"
            onClick={() => setWorkspaceView("agent")}
            className={`rounded-[22px] px-3 py-3 text-left transition ${
              workspaceView === "agent"
                ? "bg-[linear-gradient(135deg,rgba(29,185,84,0.18),rgba(255,255,255,0.05))] text-white"
                : "bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <p className="text-sm font-medium">Agent</p>
            <p className="mt-1 text-xs text-white/60">Chat and history</p>
          </motion.button>
        </div>
      </section>

      <LibraryPlaylistSection />
      <LibraryQueueSection />
    </aside>
  );
}
