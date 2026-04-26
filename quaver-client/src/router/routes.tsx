import MainApp from "../layouts/MainApp";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";
import { routePaths } from "./paths";
import type { AppRoute } from "./types";

export const appRoutes: AppRoute[] = [
  {
    path: routePaths.login,
    title: "Login",
    component: LoginPage,
    guestOnly: true,
  },
  {
    path: routePaths.register,
    title: "Register",
    component: RegisterPage,
    guestOnly: true,
  },
  {
    path: routePaths.app,
    title: "Quaver",
    component: MainApp,
    requiresAuth: true,
  },
];
