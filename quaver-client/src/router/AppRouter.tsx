import { useEffect, useMemo } from "react";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { routePaths } from "./paths";
import { RouterProvider, useRouter } from "./RouterProvider";
import { appRoutes } from "./routes";

function RoutedApp() {
  const { path, navigate } = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const route = useMemo(() => appRoutes.find((candidate) => candidate.path === path), [path]);

  useEffect(() => {
    if (path === routePaths.root || !route) {
      navigate(isAuthenticated ? routePaths.app : routePaths.login, { replace: true });
      return;
    }

    if (route.requiresAuth && !isAuthenticated) {
      navigate(routePaths.login, { replace: true });
      return;
    }

    if (route.guestOnly && isAuthenticated) {
      navigate(routePaths.app, { replace: true });
    }
  }, [isAuthenticated, navigate, path, route]);

  useEffect(() => {
    if (!route) {
      return;
    }

    document.title = `${route.title} | Quaver`;
  }, [route]);

  if (!route || path === routePaths.root) {
    return null;
  }

  if ((route.requiresAuth && !isAuthenticated) || (route.guestOnly && isAuthenticated)) {
    return null;
  }

  const CurrentRoute = route.component;
  return <CurrentRoute />;
}

export default function AppRouter() {
  return (
    <RouterProvider>
      <RoutedApp />
    </RouterProvider>
  );
}
