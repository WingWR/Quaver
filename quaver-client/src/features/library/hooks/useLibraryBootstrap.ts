import { useEffect } from "react";
import { formatBackendError } from "../../../api/http";
import { useQuaverStore } from "../../../store/useQuaverStore";
import { useUiStore } from "../../../store/useUiStore";
import { fetchLibraryBootstrap } from "../api/client";

const BACKEND_UNAVAILABLE_MESSAGE =
  "The music backend is unavailable. The app shell is still visible, but library and queue data cannot load.";

export function useLibraryBootstrap() {
  const hydrateBackendLibrary = useQuaverStore((state) => state.hydrateBackendLibrary);
  const setLibraryState = useQuaverStore((state) => state.setLibraryState);
  const pushNotice = useUiStore((state) => state.pushNotice);

  useEffect(() => {
    const controller = new AbortController();

    async function bootstrapLibrary() {
      setLibraryState({
        status: "loading",
        message: "Connecting to the music backend...",
      });

      try {
        const snapshot = await fetchLibraryBootstrap(controller.signal);

        hydrateBackendLibrary(snapshot);
        setLibraryState({
          status: "ready",
          message:
            snapshot.playlists.length || snapshot.playback?.queue.length
              ? null
              : "Backend connected. This user does not have playlists or queued tracks yet.",
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
