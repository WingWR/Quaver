/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_BACKEND_API_KEY?: string;
  readonly VITE_BACKEND_TIMEOUT_MS?: string;
  readonly VITE_AGENT_MODEL?: string;
  readonly VITE_AGENT_API_KEY?: string;
  readonly VITE_AGENT_DEFAULT_CONVERSATION_TITLE?: string;
  readonly VITE_SPOTIFY_DEVELOPER_ACCOUNT?: string;
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  readonly VITE_SPOTIFY_REDIRECT_URI?: string;
  readonly VITE_SPOTIFY_PLAYER_NAME?: string;
  readonly VITE_SPOTIFY_SCOPES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
