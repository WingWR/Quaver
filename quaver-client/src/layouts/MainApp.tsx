import { motion } from "framer-motion";
import ToastViewport from "../components/Feedback/ToastViewport";
import MainCanvasWorkspace from "../components/MainCanvas/Workspace";
import PlayerBar from "../components/PlayerBar";
import WorkspaceSidebar from "../components/Sidebar/WorkspaceSidebar";
import UserSessionButton from "../features/auth/components/UserSessionButton";
import { useLibraryBootstrap } from "../features/library/hooks/useLibraryBootstrap";
import { useSpotifyBootstrap } from "../hooks/useSpotifyBootstrap";
import { useSpotifyWebPlaybackSdk } from "../hooks/useSpotifyWebPlaybackSdk";

export default function MainApp() {
  useLibraryBootstrap();
  useSpotifyBootstrap();
  useSpotifyWebPlaybackSdk();

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-brand-black text-white lg:flex-row">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="sonic-grid absolute inset-0 opacity-45" />
        <div className="aurora-orb absolute -left-28 top-10 h-72 w-72 bg-emerald-400/22" />
        <div className="aurora-orb absolute right-[14%] top-[-7rem] h-80 w-80 bg-cyan-300/18" />
        <div className="aurora-orb absolute bottom-[-8rem] left-[42%] h-96 w-96 bg-amber-300/12" />
      </div>
      <WorkspaceSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-hero-radial">
        <UserSessionButton />
        <motion.div
          layout
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "linear-gradient(130deg, rgba(52,211,153,0.14), transparent 31%), linear-gradient(230deg, rgba(56,189,248,0.12), transparent 38%), linear-gradient(315deg, rgba(244,114,182,0.1), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0.2) 100%)",
          }}
        />
        <MainCanvasWorkspace />
        <PlayerBar />
      </div>
      <ToastViewport />
    </div>
  );
}
