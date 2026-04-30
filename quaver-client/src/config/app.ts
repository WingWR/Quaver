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
    timeoutMs: readNumber(import.meta.env.VITE_BACKEND_TIMEOUT_MS, 12_000),
  },
  agent: {
    model: "deepseek-v4-pro",
    chatModel: "deepseek-v4-pro",
    searchModel: "deepseek-v4-pro",
    defaultConversationTitle: readString(
      import.meta.env.VITE_AGENT_DEFAULT_CONVERSATION_TITLE,
      "Quaver Agent Session",
    ),
  },
  spotify: {
    developerAccount: readString(import.meta.env.VITE_SPOTIFY_DEVELOPER_ACCOUNT),
  },
};
