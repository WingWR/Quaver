import { create } from "zustand";

export interface UiNotice {
  id: string;
  message: string;
  variant: "info" | "warning" | "error";
  dedupeKey?: string;
}

interface PushNoticeInput {
  message: string;
  variant?: UiNotice["variant"];
  dedupeKey?: string;
}

interface UiStore {
  notices: UiNotice[];
  pushNotice: (input: PushNoticeInput) => void;
  dismissNotice: (id: string) => void;
}

function createNoticeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useUiStore = create<UiStore>((set) => ({
  notices: [],
  pushNotice: ({ message, variant = "warning", dedupeKey }) =>
    set((state) => {
      if (dedupeKey && state.notices.some((notice) => notice.dedupeKey === dedupeKey)) {
        return state;
      }

      return {
        notices: [
          ...state.notices,
          {
            id: createNoticeId(),
            message,
            variant,
            dedupeKey,
          },
        ],
      };
    }),
  dismissNotice: (id) =>
    set((state) => ({
      notices: state.notices.filter((notice) => notice.id !== id),
    })),
}));
