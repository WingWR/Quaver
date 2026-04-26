import { FormEvent, useState } from "react";
import AuthLayout from "../components/AuthLayout";
import AuthTextField from "../components/AuthTextField";
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 12.4a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8Z" />
      <path d="M5.4 19.5a6.6 6.6 0 0 1 13.2 0" strokeLinecap="round" />
    </svg>
  );
}

export default function RegisterPage() {
  const { navigate } = useRouter();
  const register = useAuthStore((state) => state.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    register({ name, email });
    navigate(routePaths.app, { replace: true });
  }

  return (
    <AuthLayout
      eyebrow="Start fresh"
      title="Create account"
      subtitle="Set up a local preview identity now, then replace it with real authentication later."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/[0.52]">
          <span>Already joined?</span>
          <button
            type="button"
            onClick={() => navigate(routePaths.login)}
            className="font-semibold text-cyan-100 transition hover:text-white"
          >
            Back to sign in
          </button>
        </div>
      }
    >
      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="name"
          icon={<UserIcon />}
          label="Name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Your display name"
          required
          type="text"
          value={name}
        />
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
          autoComplete="new-password"
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
          Create account
        </button>
      </form>
    </AuthLayout>
  );
}
