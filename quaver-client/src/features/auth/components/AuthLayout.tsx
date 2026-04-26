import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

function BrandGlyph() {
  return (
    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/[0.15] bg-black/30 shadow-[0_18px_46px_rgba(0,0,0,0.36)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(52,211,153,0.7),rgba(56,189,248,0.48)_45%,rgba(244,114,182,0.5))]" />
      <div className="absolute inset-2 rounded-xl bg-black/[0.42]" />
      <div className="absolute left-5 top-4 h-7 w-2 rounded-full bg-white shadow-[10px_-4px_0_rgba(255,255,255,0.76),20px_4px_0_rgba(255,255,255,0.5)]" />
    </div>
  );
}

function RhythmPanel() {
  const bars = [76, 48, 88, 56, 96, 42, 72, 64, 84, 52, 78, 46];

  return (
    <div className="relative hidden min-h-[31rem] overflow-hidden rounded-[32px] border border-white/10 bg-black/[0.28] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] lg:block">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.18),rgba(20,184,166,0.14)_42%,rgba(244,114,182,0.13))]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.48))]" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.38em] text-white/50">Quaver Session</p>
          <h2 className="mt-4 max-w-sm text-4xl font-semibold leading-tight text-white">
            Tune in before the first beat.
          </h2>
        </div>

        <div className="space-y-5">
          <div className="flex h-32 items-end gap-3">
            {bars.map((height, index) => (
              <motion.span
                key={index}
                className="w-full rounded-full bg-[linear-gradient(180deg,#ffffff,#67e8f9_42%,#fb7185)]"
                style={{ height: `${height}%` }}
                animate={{ scaleY: [0.74, 1, 0.82] }}
                transition={{
                  duration: 1.9 + index * 0.08,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[linear-gradient(135deg,#fbbf24,#fb7185,#38bdf8)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Midnight Signal</p>
                <p className="mt-1 truncate text-xs text-white/[0.52]">Quaver Default Mix</p>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#38bdf8,#fb7185)]"
                animate={{ width: ["18%", "76%", "44%"] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({ eyebrow, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08090d] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(52,211,153,0.2),transparent_28%,rgba(56,189,248,0.18)_56%,rgba(244,114,182,0.2))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_34%,rgba(0,0,0,0.42))]" />

      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 lg:grid-cols-[1fr_25rem] lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div className="max-w-xl">
            <BrandGlyph />
            <p className="mt-8 text-xs uppercase tracking-[0.42em] text-emerald-100/70">{eyebrow}</p>
            <h1 className="mt-4 text-5xl font-semibold leading-none text-white md:text-7xl">Quaver</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/[0.64]">{subtitle}</p>
          </div>
          <RhythmPanel />
        </section>

        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.48, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-black/[0.36] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.03] sm:p-6"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#34d399,#38bdf8,#f472b6,#fbbf24)]" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.34em] text-white/[0.46]">{eyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
            {children}
            <div className="mt-6 border-t border-white/10 pt-5">{footer}</div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
