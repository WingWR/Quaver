import { motion } from "framer-motion";
import MainCanvas from "../components/MainCanvas";
import PlayerBar from "../components/PlayerBar";
import Sidebar from "../components/Sidebar";
import { useSpotifyBootstrap } from "../hooks/useSpotifyBootstrap";

export default function MainApp() {
  useSpotifyBootstrap();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-brand-black text-white lg:flex-row">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-hero-radial">
        <motion.div
          layout
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(29,185,84,0.12), transparent 28%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.04), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0.2) 100%)",
          }}
        />
        <MainCanvas />
        <PlayerBar />
      </div>
    </div>
  );
}
