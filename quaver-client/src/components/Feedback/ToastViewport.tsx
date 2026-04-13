import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useUiStore } from "../../store/useUiStore";

const variantClassName = {
  info: "border-white/[0.08] bg-[#171717] text-white/88",
  warning: "border-[#c9a34f]/25 bg-[#1c1710] text-[#f4d58d]",
  error: "border-[#d15858]/25 bg-[#211313] text-[#ffb1b1]",
};

export default function ToastViewport() {
  const notices = useUiStore((state) => state.notices);
  const dismissNotice = useUiStore((state) => state.dismissNotice);

  useEffect(() => {
    if (!notices.length) {
      return;
    }

    const timers = notices.map((notice) =>
      window.setTimeout(() => dismissNotice(notice.id), 4200),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissNotice, notices]);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[220] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3">
      <AnimatePresence>
        {notices.map((notice) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto rounded-[20px] border px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.36)] ${variantClassName[notice.variant]}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-current/80" />
              <p className="text-sm leading-6">{notice.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
