import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
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
export default function AgentWorkspacePanel() {
  const isAgentWorkspace = useQuaverStore((state) => state.workspaceView === "agent");
  const {
    messages,
    draft,
    setDraft,
    status,
    helperMessage,
    canSend,
    submitDraft,
  } = useAgentConversationRuntime(isAgentWorkspace);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);

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
            messages.map((message) => (
              <motion.article
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${bubbleWrapperStyle(message.role)}`}
              >
                <div className={`flex w-full flex-col ${bubbleAlignment(message.role)}`}>
                  <div className={`w-full ${bubbleWidth(message.role)}`}>
                    <div className={`rounded-[20px] px-4 py-3 ${roleStyle(message.role)}`}>
                      <p
                        className={`whitespace-pre-wrap text-sm leading-7 ${
                          message.role === "user" ? "text-black/88" : "text-white/88"
                        }`}
                      >
                        {message.content}
                      </p>
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
