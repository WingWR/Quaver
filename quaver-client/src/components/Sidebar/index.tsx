import PlaylistSection from "./PlaylistSection";
import LiveQueueSection from "./LiveQueueSection";

export default function Sidebar() {
  return (
    <aside className="relative flex w-full flex-col bg-[#0d0d0d]/96 px-4 py-4 lg:h-full lg:w-[280px] lg:px-4 lg:py-5">
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent lg:hidden" />
      <div className="pointer-events-none absolute inset-y-4 right-0 hidden w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent lg:block" />
      <PlaylistSection />
      <LiveQueueSection />
    </aside>
  );
}
