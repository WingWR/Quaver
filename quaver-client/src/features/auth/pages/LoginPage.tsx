import { FormEvent, useState } from "react";
import AuthLayout from "../components/AuthLayout";
import AuthTextField from "../components/AuthTextField";
import DemoAccessButton from "../components/DemoAccessButton";
import { useAuthStore } from "../store/useAuthStore";
import { routePaths } from "../../../router/paths";
import { useRouter } from "../../../router/RouterProvider";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4.8 6.5h14.4v11H4.8z" rx="2" />
      <path d="m5.4 7.2 6.6 5.3 6.6-5.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M7.5 10.5V8.2a4.5 4.5 0 0 1 9 0v2.3" strokeLinecap="round" />
      <path d="M6.2 10.5h11.6v8H6.2z" rx="2" />
    </svg>
  );
}

export default function LoginPage() {
  const { navigate } = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login({ email });
    navigate(routePaths.app, { replace: true });
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="A brighter music workspace for playlists, queue control, search, and playback."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/[0.52]">
          <span>New here?</span>
          <button
            type="button"
            onClick={() => navigate(routePaths.register)}
            className="font-semibold text-cyan-100 transition hover:text-white"
          >
            Create an account
          </button>
        </div>
      }
    >
      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="email"
          icon={<MailIcon />}
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="listener@quaver.local"
          required
          type="email"
          value={email}
        />
        <AuthTextField
          autoComplete="current-password"
          icon={<LockIcon />}
          label="Password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Any password for local preview"
          required
          type="password"
          value={password}
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black shadow-[0_20px_60px_rgba(255,255,255,0.13)] transition hover:bg-cyan-50"
        >
          Sign in
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/[0.34]">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mt-5">
        <DemoAccessButton onEntered={() => navigate(routePaths.app, { replace: true })} />
      </div>
    </AuthLayout>
  );
}
