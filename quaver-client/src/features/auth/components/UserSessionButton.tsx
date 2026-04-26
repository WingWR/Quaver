import { useAuthStore } from "../store/useAuthStore";
import { routePaths } from "../../../router/paths";
import { useRouter } from "../../../router/RouterProvider";

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M10 6H6.8A1.8 1.8 0 0 0 5 7.8v8.4A1.8 1.8 0 0 0 6.8 18H10" strokeLinecap="round" />
      <path d="M14 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 12H18" strokeLinecap="round" />
    </svg>
  );
}

export default function UserSessionButton() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { navigate } = useRouter();

  if (!user) {
    return null;
  }

  const initial = user.name.trim().slice(0, 1).toUpperCase() || "Q";

  function handleLogout() {
    logout();
    navigate(routePaths.login, { replace: true });
  }

  return (
    <div className="absolute right-4 top-4 z-[70] flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-white/10 bg-black/[0.38] px-2 py-2 shadow-[0_18px_54px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:right-8 md:top-6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#34d399,#38bdf8,#f472b6)] text-xs font-bold text-black">
        {initial}
      </div>
      <div className="hidden min-w-0 sm:block">
        <p className="max-w-[9rem] truncate text-xs font-semibold text-white">{user.name}</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/[0.38]">{user.mode}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        aria-label="Sign out"
        title="Sign out"
      >
        <ExitIcon />
      </button>
    </div>
  );
}
