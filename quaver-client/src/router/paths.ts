export const routePaths = {
  root: "/",
  login: "/login",
  register: "/register",
  app: "/app",
} as const;

export type AppRoutePath = (typeof routePaths)[keyof typeof routePaths];
