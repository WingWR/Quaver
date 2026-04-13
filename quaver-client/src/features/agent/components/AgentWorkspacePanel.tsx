import { motion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import { useQuaverStore } from "../../../store/useQuaverStore";
import type { AgentMessage } from "../api/types";
import { useAgentConversationRuntime } from "../hooks/useAgentConversationRuntime";

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: AgentMessage["role"]) {
  if (role === "assistant") {
    return "Agent";
  }

  if (role === "system") {
    return "System";
  }

  return "You";
}

function roleStyle(role: AgentMessage["role"]) {
  if (role === "assistant") {
    return "border-white/[0.08] bg-white/[0.05] text-white";
  }

  if (role === "system") {
    return "border-white/[0.08] bg-white/[0.03] text-white/80";
  }

  return "border-white bg-white text-black";
}

function bubbleAlignment(role: AgentMessage["role"]) {
  if (role === "user") {
    return "items-end";
  }

  if (role === "system") {
    return "items-center";
  }

  return "items-start";
}

function bubbleWrapperStyle(role: AgentMessage["role"]) {
  if (role === "user") {
    return "justify-end";
  }

  if (role === "system") {
    return "justify-center";
  }

  return "justify-start";
}

function bubbleWidth(role: AgentMessage["role"]) {
  if (role === "system") {
    return "max-w-2xl";
  }

  return "max-w-[min(78%,48rem)]";
}

function metaTextStyle(role: AgentMessage["role"]) {
  if (role === "user") {
    return "text-black/60";
  }

  return "text-brand-grey";
}

function operationCardStyle(role: AgentMessage["role"]) {
  if (role === "user") {
    return "border-black/10 bg-black/[0.04]";
  }

  return "border-white/[0.06] bg-black/20";
}

function operationTextStyle(role: AgentMessage["role"]) {
  if (role === "user") {
    return "text-black/68";
  }

  return "text-brand-grey";
}

export default function AgentWorkspacePanel() {
  const isAgentWorkspace = useQuaverStore((state) => state.workspaceView === "agent");
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const playlists = useQuaverStore((state) => state.playlists);
  const {
    conversation,
    messages,
    draft,
    setDraft,
    status,
    helperMessage,
    canSend,
    reloadConversation,
    submitDraft,
  } = useAgentConversationRuntime(isAgentWorkspace);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null,
    [playlists, selectedPlaylistId],
  );

  useEffect(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status, helperMessage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-white/[0.06] bg-black/20">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-sm font-semibold text-white">
                AG
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">
                  {conversation?.title ?? "Agent Conversation"}
                </p>
                <p className="mt-1 truncate text-sm text-brand-grey">
                  {selectedPlaylist
                    ? `Playlist context: ${selectedPlaylist.name}`
                    : "No playlist context selected"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-spotify-green/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-spotify-green">
              {status === "submitting"
                ? "Sending"
                : status === "loading"
                  ? "Connecting"
                  : status === "error"
                    ? "Waiting backend"
                    : "Ready"}
            </span>
            <button
              type="button"
              onClick={() => void reloadConversation()}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/84 transition hover:bg-white/[0.08] hover:text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        <div
          ref={messageViewportRef}
          className="scrollbar-brand flex-1 space-y-5 overflow-y-auto px-5 py-6"
        >
          {helperMessage ? (
            <div className="flex justify-center">
              <div className="max-w-3xl rounded-2xl border border-[#c9a34f]/20 bg-[#1a1510] px-4 py-3 text-sm leading-6 text-[#f2d08a]">
                {helperMessage}
              </div>
            </div>
          ) : null}

          {messages.length ? (
            messages.map((message) => (
              <motion.article
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${bubbleWrapperStyle(message.role)}`}
              >
                <div className={`flex w-full flex-col ${bubbleAlignment(message.role)}`}>
                  <div className={`w-full ${bubbleWidth(message.role)}`}>
                    <div className={`rounded-[24px] border px-4 py-4 ${roleStyle(message.role)}`}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
                            message.role === "user"
                              ? "bg-black/[0.06] text-black/60"
                              : "bg-white/[0.06] text-white/72"
                          }`}
                        >
                          {roleLabel(message.role)}
                        </span>
                        {message.model ? (
                          <span
                            className={`text-[11px] uppercase tracking-[0.18em] ${metaTextStyle(message.role)}`}
                          >
                            {message.model}
                          </span>
                        ) : null}
                      </div>

                      <p
                        className={`mt-3 whitespace-pre-wrap text-sm leading-7 ${
                          message.role === "user" ? "text-black/88" : "text-white/88"
                        }`}
                      >
                        {message.content}
                      </p>

                      {message.operations?.length ? (
                        <div className={`mt-4 space-y-2 rounded-[18px] p-3 ${operationCardStyle(message.role)}`}>
                          {message.operations.map((operation) => (
                            <div
                              key={operation.id}
                              className={`rounded-2xl border px-3 py-2 ${operationCardStyle(message.role)}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p
                                  className={`text-sm font-medium ${
                                    message.role === "user" ? "text-black/84" : "text-white/88"
                                  }`}
                                >
                                  {operation.title}
                                </p>
                                <span
                                  className={`text-[11px] uppercase tracking-[0.18em] ${operationTextStyle(message.role)}`}
                                >
                                  {operation.status}
                                </span>
                              </div>
                              {operation.detail ? (
                                <p
                                  className={`mt-1 text-sm leading-6 ${operationTextStyle(message.role)}`}
                                >
                                  {operation.detail}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={`mt-2 px-1 text-xs ${metaTextStyle(message.role)} ${
                        message.role === "user"
                          ? "text-right"
                          : message.role === "system"
                            ? "text-center"
                            : "text-left"
                      }`}
                    >
                      {formatTimestamp(message.createdAt)}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))
          ) : (
            <div className="flex min-h-full items-center justify-center py-8">
              <div className="max-w-2xl rounded-[28px] border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-8 text-center">
                <p className="text-xs uppercase tracking-[0.26em] text-brand-grey">Conversation</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  No conversation history yet
                </h2>
                <p className="mt-3 text-sm leading-7 text-brand-grey">
                  Start with a message below. After the backend is connected, the full reply stream
                  and operation history will appear here in chat format.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.05] px-5 py-4">
          <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.03] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
            <div className="flex items-end gap-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitDraft();
                  }
                }}
                rows={1}
                placeholder="Message Agent..."
                className="min-h-[38px] max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-white outline-none placeholder:text-brand-grey"
              />
              <button
                type="button"
                onClick={() => void submitDraft()}
                disabled={!draft.trim() || !canSend}
                className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#f3f3f3] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {status === "submitting" ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
