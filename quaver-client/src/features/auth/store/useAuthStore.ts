import { create } from "zustand";

const AUTH_STORAGE_KEY = "quaver.auth.session";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mode: "demo" | "local";
}

interface LoginPayload {
  email: string;
  name?: string;
}

interface RegisterPayload {
  name: string;
  email: string;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => void;
  register: (payload: RegisterPayload) => void;
  enterDemo: () => void;
  logout: () => void;
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function persistUser(user: AuthUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function createLocalUser(payload: LoginPayload | RegisterPayload): AuthUser {
  const email = payload.email.trim().toLowerCase();
  const fallbackName = email.split("@")[0] || "Quaver User";
  const name = payload.name?.trim() || fallbackName;

  return {
    id: `local-${email}`,
    email,
    name,
    mode: "local",
  };
}

const demoUser: AuthUser = {
  id: "demo-listener",
  name: "Demo Listener",
  email: "demo@quaver.local",
  mode: "demo",
};

const initialUser = readStoredUser();

export const useAuthStore = create<AuthStore>((set) => ({
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  login: (payload) => {
    const user = createLocalUser(payload);
    persistUser(user);
    set({ user, isAuthenticated: true });
  },
  register: (payload) => {
    const user = createLocalUser(payload);
    persistUser(user);
    set({ user, isAuthenticated: true });
  },
  enterDemo: () => {
    persistUser(demoUser);
    set({ user: demoUser, isAuthenticated: true });
  },
  logout: () => {
    persistUser(null);
    set({ user: null, isAuthenticated: false });
  },
}));
