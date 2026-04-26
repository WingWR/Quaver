/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_BASE_URL?: string;
  readonly VITE_BACKEND_API_KEY?: string;
  readonly VITE_BACKEND_TIMEOUT_MS?: string;
  readonly VITE_AGENT_MODEL?: string;
  readonly VITE_AGENT_CHAT_MODEL?: string;
  readonly VITE_AGENT_SEARCH_MODEL?: string;
  readonly VITE_AGENT_API_KEY?: string;
  readonly VITE_AGENT_DEFAULT_CONVERSATION_TITLE?: string;
  readonly VITE_SPOTIFY_DEVELOPER_ACCOUNT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
