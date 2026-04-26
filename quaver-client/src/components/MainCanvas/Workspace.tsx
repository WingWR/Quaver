import { motion } from "framer-motion";
import AgentWorkspacePanel from "../../features/agent/components/AgentWorkspacePanel";
import LibraryWorkspaceView from "../../features/library/components/LibraryWorkspaceView";
import { useQuaverStore } from "../../store/useQuaverStore";

export default function MainCanvasWorkspace() {
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const currentTrack = queue[currentTrackIndex];
  const workspaceView = useQuaverStore((state) => state.workspaceView);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4 md:px-8 md:pb-6 md:pt-8">
      {currentTrack ? (
        <motion.div
          key={currentTrack.id}
          layoutId="main-canvas-glow"
          className="pointer-events-none absolute inset-x-0 top-0 h-56 blur-3xl"
          style={{
            background: `linear-gradient(115deg, ${currentTrack.accent}45 0%, rgba(56,189,248,0.18) 42%, transparent 76%)`,
          }}
        />
      ) : null}

      <motion.section className="glass-surface relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.42)] md:p-7">
        <div className="pointer-events-none absolute inset-[1px] rounded-[33px] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.008))]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {workspaceView === "agent" ? <AgentWorkspacePanel /> : <LibraryWorkspaceView />}
        </div>
      </motion.section>
    </main>
  );
}
