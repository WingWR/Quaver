import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AppRoutePath } from "./paths";
import type { NavigateOptions } from "./types";

interface RouterContextValue {
  path: string;
  navigate: (to: AppRoutePath, options?: NavigateOptions) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function getBrowserPath() {
  return window.location.pathname || "/";
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(getBrowserPath);

  useEffect(() => {
    function handlePopState() {
      setPath(getBrowserPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: AppRoutePath, options?: NavigateOptions) => {
    const nextPath = to;
    if (getBrowserPath() === nextPath) {
      setPath(nextPath);
      return;
    }

    if (options?.replace) {
      window.history.replaceState({}, "", nextPath);
    } else {
      window.history.pushState({}, "", nextPath);
    }
    setPath(nextPath);
  }, []);

  const value = useMemo(() => ({ path, navigate }), [navigate, path]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within RouterProvider");
  }

  return context;
}
