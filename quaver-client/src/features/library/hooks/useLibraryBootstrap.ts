import { useEffect } from "react";
import { formatBackendError } from "../../../api/http";
import { useQuaverStore } from "../../../store/useQuaverStore";
import { useUiStore } from "../../../store/useUiStore";
import { fetchLibraryBootstrap } from "../api/client";

const BACKEND_UNAVAILABLE_MESSAGE =
  "音乐后端暂未接入，当前可以查看页面结构，但歌单和队列数据不会显示。";

export function useLibraryBootstrap() {
  const hydrateBackendLibrary = useQuaverStore((state) => state.hydrateBackendLibrary);
  const setLibraryState = useQuaverStore((state) => state.setLibraryState);
  const pushNotice = useUiStore((state) => state.pushNotice);

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrapLibrary() {
      setLibraryState({
        status: "loading",
        message: "正在连接音乐后端...",
      });

      try {
        const snapshot = await fetchLibraryBootstrap(controller.signal);

        hydrateBackendLibrary(snapshot);
        setLibraryState({
          status: "ready",
          message:
            snapshot.playlists.length || snapshot.playback?.queue.length
              ? null
              : "后端已连接，当前还没有可展示的歌单或队列数据。",
          lastLoadedAt: snapshot.serverTime ?? new Date().toISOString(),
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = formatBackendError(error, BACKEND_UNAVAILABLE_MESSAGE);
        setLibraryState({
          status: "error",
          message,
        });
        pushNotice({
          message,
          variant: "warning",
          dedupeKey: "library-bootstrap",
        });
      }
    }

    void bootstrapLibrary();

    return () => controller.abort();
  }, [hydrateBackendLibrary, pushNotice, setLibraryState]);
}
