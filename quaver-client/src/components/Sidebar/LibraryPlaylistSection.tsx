import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatBackendError } from "../../api/http";
import {
  createBackendPlaylist,
  deleteBackendPlaylist,
  updateBackendPlaylist,
} from "../../features/library/api/client";
import { useQuaverStore } from "../../store/useQuaverStore";
import { useUiStore } from "../../store/useUiStore";
import type { Playlist } from "../../types/music";

type EditorMode = "create" | "rename";

interface PlaylistMenuState {
  x: number;
  y: number;
  playlist: Playlist;
}

function PlaylistArtwork({
  cover,
  accent,
  name,
}: {
  cover?: string;
  accent?: string;
  name: string;
}) {
  if (cover) {
    return (
      <div className="relative h-14 w-14 shrink-0">
        <span
          className="absolute -inset-1 rounded-[22px] opacity-50 blur-lg"
          style={{ background: accent || "#34d399" }}
        />
        <img
          src={cover}
          alt={name}
          className="relative h-14 w-14 rounded-[20px] border border-white/[0.12] object-cover shadow-[0_14px_34px_rgba(0,0,0,0.3)]"
        />
      </div>
    );
  }

  return (
    <div
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[20px] border border-white/[0.12] shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
      style={{
        background: `linear-gradient(135deg, ${accent || "#34d399"}cc, rgba(56,189,248,0.38), rgba(244,114,182,0.24))`,
      }}
    >
      <div className="absolute -right-4 -top-4 h-10 w-10 rounded-full bg-white/24 blur-xl" />
      <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/30" />
    </div>
  );
}

function PlaylistContextMenu({
  menu,
  onClose,
  onRename,
  onDelete,
}: {
  menu: PlaylistMenuState | null;
  onClose: () => void;
  onRename: (playlist: Playlist) => void;
  onDelete: (playlist: Playlist) => void;
}) {
  useEffect(() => {
    if (!menu) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200]" onContextMenu={(event) => event.preventDefault()}>
        <div className="absolute inset-0" onMouseDown={onClose} onContextMenu={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.16 }}
          className="absolute z-[210] min-w-[220px] overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#151515] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.46)] ring-1 ring-black/50"
          style={{
            left: Math.min(menu.x, window.innerWidth - 248),
            top: Math.min(menu.y, window.innerHeight - 160),
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-white/[0.05] px-3 py-2">
            <p className="truncate text-sm font-semibold text-white">{menu.playlist.name}</p>
            <p className="truncate text-xs text-brand-grey">
              {menu.playlist.tracks.length} tracks
            </p>
          </div>

          <div className="space-y-1 px-1 py-2">
            <button
              type="button"
              onClick={() => {
                onRename(menu.playlist);
                onClose();
              }}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-white/84 transition hover:bg-white/[0.06] hover:text-white"
            >
              Rename playlist
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(menu.playlist);
                onClose();
              }}
              className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-[#f4b1b1] transition hover:bg-[#7f1d1d]/30 hover:text-[#ffd6d6]"
            >
              Delete playlist
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}

export default function LibraryPlaylistSection() {
  const playlists = useQuaverStore((state) => state.playlists);
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const setSelectedPlaylist = useQuaverStore((state) => state.setSelectedPlaylist);
  const replaceBackendPlaylists = useQuaverStore((state) => state.replaceBackendPlaylists);
  const library = useQuaverStore((state) => state.library);
  const pushNotice = useUiStore((state) => state.pushNotice);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menu, setMenu] = useState<PlaylistMenuState | null>(null);

  function resetEditor() {
    setEditorMode(null);
    setEditingPlaylistId(null);
    setName("");
    setDescription("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response =
        editorMode === "rename" && editingPlaylistId
          ? await updateBackendPlaylist(editingPlaylistId, {
              name,
              description,
            })
          : await createBackendPlaylist({
              name,
              description,
            });

      replaceBackendPlaylists(response.playlists ?? [], response.selectedPlaylistId);
      resetEditor();
    } catch (error) {
      pushNotice({
        message: formatBackendError(
          error,
          editorMode === "rename"
            ? "The backend could not update this playlist right now."
            : "The backend could not create this playlist right now.",
        ),
        variant: "warning",
        dedupeKey: editorMode === "rename" ? "playlist-rename" : "playlist-create",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function startCreatePlaylist() {
    setEditorMode("create");
    setEditingPlaylistId(null);
    setName("");
    setDescription("");
  }

  function startRenamePlaylist(playlist: Playlist) {
    setEditorMode("rename");
    setEditingPlaylistId(playlist.id);
    setName(playlist.name);
    setDescription(playlist.description ?? "");
  }

  async function handleDeletePlaylist(playlist: Playlist) {
    if (!window.confirm(`Delete playlist "${playlist.name}"?`)) {
      return;
    }

    try {
      const response = await deleteBackendPlaylist(playlist.id);
      replaceBackendPlaylists(response.playlists ?? [], response.selectedPlaylistId);
      if (editingPlaylistId === playlist.id) {
        resetEditor();
      }
    } catch (error) {
      pushNotice({
        message: formatBackendError(error, "The backend could not delete this playlist right now."),
        variant: "warning",
        dedupeKey: `playlist-delete-${playlist.id}`,
      });
    }
  }

  return (
    <section className="relative flex min-h-0 flex-col lg:flex-1">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="section-eyebrow">Library</p>
          <h2 className="chromatic-title mt-1 text-xl font-bold tracking-[-0.04em]">
            Playlists
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="metric-chip rounded-full px-3 py-1 text-[11px] text-white/58">
            {playlists.length} Lists
          </div>
          <button
            type="button"
            onClick={() => {
              if (editorMode === "create") {
                resetEditor();
                return;
              }
              startCreatePlaylist();
            }}
            className="rounded-full bg-[linear-gradient(135deg,#d9fff0,#67e8f9)] px-3 py-1 text-[11px] font-bold text-black shadow-[0_10px_24px_rgba(103,232,249,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(103,232,249,0.22)]"
          >
            {editorMode === "create" ? "Close" : "New"}
          </button>
        </div>
      </div>

      {editorMode ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="sonic-panel mb-4 space-y-3 rounded-[26px] p-4"
        >
          <p className="section-eyebrow relative">
            {editorMode === "rename" ? "Rename playlist" : "Create playlist"}
          </p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Playlist name"
            className="relative w-full rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/30 focus:bg-black/36"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description"
            rows={3}
            className="relative w-full resize-none rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-200/30 focus:bg-black/36"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => resetEditor()}
              className="rounded-full bg-white/[0.055] px-4 py-2 text-sm text-white/78 transition hover:bg-white/[0.09] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[linear-gradient(135deg,#d9fff0,#fbbf24)] px-4 py-2 text-sm font-bold text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? editorMode === "rename"
                  ? "Saving..."
                  : "Creating..."
                : editorMode === "rename"
                  ? "Save changes"
                  : "Create playlist"}
            </button>
          </div>
        </form>
      ) : null}

      {playlists.length ? (
        <div className="scrollbar-brand max-h-[190px] space-y-2 overflow-y-auto pr-1 lg:max-h-none">
          {playlists.map((playlist) => {
            const isActive = playlist.id === selectedPlaylistId;

            return (
              <motion.button
                layout
                key={playlist.id}
                whileHover={{ y: -2 }}
                type="button"
                onClick={() => setSelectedPlaylist(playlist.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenu({
                    x: event.clientX,
                    y: event.clientY,
                    playlist,
                  });
                }}
                className={`kinetic-card group w-full rounded-[28px] px-4 py-4 text-left transition duration-300 ${
                  isActive
                    ? "border-emerald-200/18 bg-[linear-gradient(135deg,rgba(29,185,84,0.18),rgba(103,232,249,0.08),rgba(255,255,255,0.035))] shadow-[0_18px_48px_rgba(29,185,84,0.12)]"
                    : "hover:border-white/[0.12] hover:bg-white/[0.045]"
                }`}
              >
                {isActive ? (
                  <motion.div
                    layoutId="active-playlist-pill"
                    className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_18%_0%,rgba(29,185,84,0.28),transparent_46%)]"
                  />
                ) : null}
                <div className="relative flex items-center gap-3">
                  <PlaylistArtwork
                    cover={playlist.cover}
                    accent={playlist.accent}
                    name={playlist.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{playlist.name}</p>
                      {isActive ? (
                        <span className="mini-eq shrink-0" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/46">
                      {playlist.description || "No description yet."}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/34">
                      {playlist.tracks.length} tracks
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="sonic-panel rounded-[28px] border-dashed px-4 py-5">
          <p className="text-sm font-medium text-white">No playlists yet</p>
          <p className="relative mt-2 text-sm leading-6 text-white/52">
            {library.message ??
              "This user has not created any playlists yet. New playlists will appear here as soon as they are saved in Quaver."}
          </p>
        </div>
      )}

      <PlaylistContextMenu
        menu={menu}
        onClose={() => setMenu(null)}
        onRename={startRenamePlaylist}
        onDelete={(playlist) => {
          void handleDeletePlaylist(playlist);
        }}
      />
    </section>
  );
}
