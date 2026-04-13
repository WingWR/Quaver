const defaultSpotifyScopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
];

function readString(value: string | undefined, fallback = "") {
  return value?.trim() ?? fallback;
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readList(value: string | undefined, fallback: string[]) {
  const items = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items?.length ? items : fallback;
}

export const appConfig = {
  backend: {
    baseUrl: readString(import.meta.env.VITE_BACKEND_BASE_URL, "/api"),
    apiKey: readString(import.meta.env.VITE_BACKEND_API_KEY),
    timeoutMs: readNumber(import.meta.env.VITE_BACKEND_TIMEOUT_MS, 12_000),
  },
  agent: {
    model: readString(import.meta.env.VITE_AGENT_MODEL, "gpt-4.1-mini"),
    apiKey: readString(import.meta.env.VITE_AGENT_API_KEY),
    defaultConversationTitle: readString(
      import.meta.env.VITE_AGENT_DEFAULT_CONVERSATION_TITLE,
      "Quaver Agent Session",
    ),
  },
  spotify: {
    developerAccount: readString(import.meta.env.VITE_SPOTIFY_DEVELOPER_ACCOUNT),
    clientId: readString(import.meta.env.VITE_SPOTIFY_CLIENT_ID),
    redirectUri: readString(
      import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
      typeof window !== "undefined" ? window.location.origin : "",
    ),
    playerName: readString(import.meta.env.VITE_SPOTIFY_PLAYER_NAME, "Quaver Web Player"),
    scopes: readList(import.meta.env.VITE_SPOTIFY_SCOPES, defaultSpotifyScopes),
  },
};
