import { motion } from "framer-motion";
import { useAuthStore } from "../store/useAuthStore";

interface DemoAccessButtonProps {
  onEntered: () => void;
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M13.7 2.4 4.9 13.1c-.44.54-.06 1.36.64 1.36h5.48l-1.25 6.38c-.17.86.91 1.39 1.48.72l8.84-10.73c.44-.54.06-1.36-.64-1.36h-5.5l1.25-6.36c.17-.86-.92-1.39-1.5-.71Z" />
    </svg>
  );
}

export default function DemoAccessButton({ onEntered }: DemoAccessButtonProps) {
  const enterDemo = useAuthStore((state) => state.enterDemo);

  function handleClick() {
    enterDemo();
    onEntered();
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/[0.22] bg-[linear-gradient(135deg,rgba(52,211,153,0.18),rgba(56,189,248,0.16),rgba(244,114,182,0.14))] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_46px_rgba(45,212,191,0.14)] transition hover:border-cyan-100/[0.34] hover:bg-white/[0.08]"
    >
      <BoltIcon />
      Continue with default account
    </motion.button>
  );
}
