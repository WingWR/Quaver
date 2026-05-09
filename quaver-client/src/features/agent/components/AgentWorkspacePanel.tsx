import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { usePlaybackControllerRuntime } from "../../../hooks/usePlaybackControllerRuntime";
import { useQuaverStore } from "../../../store/useQuaverStore";
import type { Track } from "../../../types/music";
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

function roleStyle(role: AgentMessage["role"]) {
  if (role === "assistant") {
    return "bg-white/[0.06] text-white";
  }

  if (role === "system") {
    return "bg-white/[0.04] text-white/74";
  }

  return "bg-white text-black";
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
    return "max-w-xl";
  }

  return "max-w-[min(68%,32rem)]";
}

function metaTextStyle(role: AgentMessage["role"]) {
  if (role === "user") {
    return "text-black/60";
  }

  return "text-brand-grey";
}

interface AgentTrackCards {
  type: "track_list";
  title?: string;
  tracks: Track[];
}

function readTrackCards(metadata?: Record<string, unknown>): AgentTrackCards | null {
  const cards = metadata?.cards;
  if (!cards || typeof cards !== "object") {
    return null;
  }

  const candidate = cards as Partial<AgentTrackCards>;
  if (candidate.type !== "track_list" || !Array.isArray(candidate.tracks)) {
    return null;
  }

  return {
    type: "track_list",
    title: typeof candidate.title === "string" ? candidate.title : "Tracks",
    tracks: candidate.tracks,
  };
}

function AgentTrackCardList({
  cards,
  onPlay,
}: {
  cards: AgentTrackCards;
  onPlay: (tracks: Track[], index: number) => void;
}) {
  if (!cards.tracks.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-[18px] border border-white/[0.07] bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-grey">
          {cards.title}
        </p>
        <span className="text-xs text-white/45">{cards.tracks.length} tracks</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.tracks.slice(0, 8).map((track, index) => (
          <button
            key={`${track.id}-${index}`}
            type="button"
            onClick={() => onPlay(cards.tracks, index)}
            className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white/[0.045] px-3 py-2 text-left transition hover:bg-white/[0.09]"
          >
            {track.artwork ? (
              <img
                src={track.artwork}
                alt={track.title}
                className="h-11 w-11 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-xl bg-[linear-gradient(135deg,rgba(52,211,153,0.4),rgba(56,189,248,0.22))]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white/90 group-hover:text-white">
                {track.title}
              </p>
              <p className="truncate text-xs text-brand-grey">
                {track.artist}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AgentWorkspacePanel() {
  const isAgentWorkspace = useQuaverStore((state) => state.workspaceView === "agent");
  const { playTrackList } = usePlaybackControllerRuntime();
  const {
    messages,
    operations,
    runtimeStatus,
    draft,
    setDraft,
    status,
    helperMessage,
    canSend,
    submitDraft,
    model,
  } = useAgentConversationRuntime(isAgentWorkspace);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);
  const isStreaming = status === "submitting";
  const isAiReady = runtimeStatus?.aiKeyConfigured ?? false;

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isStreaming
                    ? "agent-ready-dot bg-cyan-300"
                    : isAiReady
                      ? "bg-emerald-300"
                      : "bg-amber-300"
                }`}
              />
              <h2 className="text-base font-semibold text-white">Agent</h2>
            </div>
            <p className="mt-1 truncate text-xs text-brand-grey">
              DeepSeek {runtimeStatus?.aiAgentModel ?? model} ·{" "}
              {isAiReady ? "API connected" : "Waiting for API key"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {["创建歌单 夜跑", "把七里香加入歌单 夜跑", "下一首播放 稻香"].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setDraft(prompt)}
                className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-white/72 transition hover:bg-white/[0.09] hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {operations.length ? (
          <div className="border-b border-white/[0.05] px-5 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {operations.map((operation) => (
                <div
                  key={operation.id}
                  className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/72"
                  title={operation.detail}
                >
                  {operation.title}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          ref={messageViewportRef}
          className="scrollbar-brand flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {helperMessage ? (
            <div className="flex justify-center">
              <div className="max-w-xl rounded-full bg-white/[0.05] px-4 py-2 text-xs leading-6 text-brand-grey">
                {helperMessage}
              </div>
            </div>
          ) : null}

          {messages.length ? (
            messages.map((message) => {
              const cards = readTrackCards(message.metadata);

              return (
                <motion.article
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${bubbleWrapperStyle(message.role)}`}
                >
                  <div className={`flex w-full flex-col ${bubbleAlignment(message.role)}`}>
                    <div className={`w-full ${cards ? "max-w-[min(82%,44rem)]" : bubbleWidth(message.role)}`}>
                      <div className={`rounded-[20px] px-4 py-3 ${roleStyle(message.role)}`}>
                        <p
                          className={`whitespace-pre-wrap text-sm leading-7 ${
                            message.role === "user" ? "text-black/88" : "text-white/88"
                          }`}
                        >
                          {message.content || (message.status === "running" ? "..." : "")}
                        </p>
                        {cards ? (
                          <AgentTrackCardList
                            cards={cards}
                            onPlay={(tracks, index) =>
                              void playTrackList(tracks, index, `agent-card-${tracks[index]?.id ?? index}`)
                            }
                          />
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
              );
            })
          ) : (
            <div className="flex min-h-full items-center justify-center py-8">
              <div className="max-w-md rounded-[20px] bg-white/[0.04] px-5 py-4 text-center">
                <p className="text-sm leading-7 text-brand-grey">
                  Start the conversation below.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.05] px-5 py-4">
          <div className="rounded-[22px] bg-white/[0.04] p-3">
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
