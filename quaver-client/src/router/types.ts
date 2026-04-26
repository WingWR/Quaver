import type { ComponentType } from "react";
import type { AppRoutePath } from "./paths";

export interface AppRoute {
  path: AppRoutePath;
  title: string;
  component: ComponentType;
  requiresAuth?: boolean;
  guestOnly?: boolean;
}

export interface NavigateOptions {
  replace?: boolean;
}
