function readString(value: string | undefined, fallback = "") {
  return value?.trim() ?? fallback;
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const appConfig = {
  backend: {
    baseUrl: readString(import.meta.env.VITE_BACKEND_BASE_URL, "/api"),
    apiKey: readString(import.meta.env.VITE_BACKEND_API_KEY),
    timeoutMs: readNumber(import.meta.env.VITE_BACKEND_TIMEOUT_MS, 12_000),
  },
  agent: {
    model: readString(
      import.meta.env.VITE_AGENT_CHAT_MODEL ?? import.meta.env.VITE_AGENT_MODEL,
      "gpt-5",
    ),
    chatModel: readString(
      import.meta.env.VITE_AGENT_CHAT_MODEL ?? import.meta.env.VITE_AGENT_MODEL,
      "gpt-5",
    ),
    searchModel: readString(import.meta.env.VITE_AGENT_SEARCH_MODEL, "gpt-4.1-mini"),
    apiKey: readString(import.meta.env.VITE_AGENT_API_KEY),
    defaultConversationTitle: readString(
      import.meta.env.VITE_AGENT_DEFAULT_CONVERSATION_TITLE,
      "Quaver Agent Session",
    ),
  },
  spotify: {
    developerAccount: readString(import.meta.env.VITE_SPOTIFY_DEVELOPER_ACCOUNT),
  },
};
