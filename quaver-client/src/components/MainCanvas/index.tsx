import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import TrackContextMenu from "../ContextMenu/TrackContextMenu";
import type { Track } from "../../types/music";
import { usePlaybackController } from "../../hooks/usePlaybackController";
import { useQuaverStore } from "../../store/useQuaverStore";

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M14 6L8 12L14 18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12H20" strokeLinecap="round" />
    </svg>
  );
}

function getActiveLyricIndex(track: Track, progress: number) {
  if (!track.lyrics?.length) {
    return -1;
  }

  return track.lyrics.reduce((activeIndex, line, index) => {
    return progress >= line.timestamp ? index : activeIndex;
  }, 0);
}

function LyricsPanel({
  track,
  progress,
  onBack,
}: {
  track: Track;
  progress: number;
  onBack: () => void;
}) {
  const activeLyricIndex = getActiveLyricIndex(track, progress);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
      <div className="flex w-full flex-col justify-between border-b border-white/[0.04] pb-6 lg:w-[380px] lg:border-b-0 lg:border-r lg:border-white/[0.04] lg:pb-0 lg:pr-8">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white/78 transition hover:bg-white/[0.08] hover:text-white"
          >
            <BackIcon />
            返回歌单
          </button>
          <img
            src={track.artwork}
            alt={track.title}
            className="mt-6 h-64 w-64 rounded-[30px] object-cover shadow-[0_28px_80px_rgba(0,0,0,0.38)]"
          />
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-brand-grey">Lyrics View</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{track.title}</h2>
          <p className="mt-2 text-base text-brand-grey">
            {track.artist} · {track.album}
          </p>
        </div>

        <div className="mt-6 rounded-[26px] bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-brand-grey">Progress</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-spotify-green"
              style={{ width: `${(progress / Math.max(track.duration, 1)) * 100}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-brand-grey">
            <span>{formatDuration(progress)}</span>
            <span>{formatDuration(track.duration)}</span>
          </div>
        </div>
      </div>

      <div className="scrollbar-brand mt-6 min-h-0 flex-1 overflow-y-auto lg:mt-0 lg:pl-10">
        {track.lyrics?.length ? (
          <div className="space-y-5 py-4">
            {track.lyrics.map((line, index) => {
              const isActive = index === activeLyricIndex;
              return (
                <motion.p
                  key={line.id}
                  layout
                  className={`max-w-3xl text-2xl leading-[1.45] transition md:text-3xl ${
                    isActive ? "text-white" : "text-white/34"
                  }`}
                >
                  {line.text}
                </motion.p>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col justify-center rounded-[30px] bg-white/[0.03] px-8">
            <p className="text-xs uppercase tracking-[0.28em] text-brand-grey">Lyrics</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">当前歌曲没有可用歌词</h3>
            <p className="mt-3 max-w-2xl text-base leading-7 text-brand-grey">
              Spotify 当前公开的 Web API 与 Web Playback SDK 不提供官方歌词接口。
              这个面板已经接入真实播放状态，但歌词数据仍需要你额外接入有授权的歌词服务。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MainCanvas() {
  const playlists = useQuaverStore((state) => state.playlists);
  const selectedPlaylistId = useQuaverStore((state) => state.selectedPlaylistId);
  const queue = useQuaverStore((state) => state.queue);
  const currentTrackIndex = useQuaverStore((state) => state.currentTrackIndex);
  const currentTrack = queue[currentTrackIndex];
  const canvasView = useQuaverStore((state) => state.canvasView);
  const setCanvasView = useQuaverStore((state) => state.setCanvasView);
  const spotify = useQuaverStore((state) => state.spotify);
  const progress = useQuaverStore((state) => state.progress);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: Track;
  } | null>(null);
  const {
    connectSpotify,
    playPlaylistTrack,
    queueTrackNext,
    queueTrackLater,
    addTrackToPlaylist,
  } = usePlaybackController();
  const selectedPlaylist =
    playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? playlists[0];

  useEffect(() => {
    if (canvasView === "lyrics" && currentTrack?.source !== "spotify") {
      setCanvasView("browse");
    }
  }, [canvasView, currentTrack, setCanvasView]);

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-4 md:px-8 md:pb-6 md:pt-8">
      {currentTrack ? (
        <motion.div
          key={currentTrack.id}
          layoutId="main-canvas-glow"
          className="pointer-events-none absolute right-[-8%] top-[-12%] h-80 w-80 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${currentTrack.accent}50 0%, transparent 70%)`,
          }}
        />
      ) : null}

      <motion.section
        className="glass-surface relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[34px] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.42)] md:p-7"
      >
        <div className="pointer-events-none absolute inset-[1px] rounded-[33px] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.008))]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {canvasView === "lyrics" && currentTrack ? (
            <LyricsPanel
              track={currentTrack}
              progress={progress}
              onBack={() => setCanvasView("browse")}
            />
          ) : (
            <>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                  <img
                    src={selectedPlaylist.cover}
                    alt={selectedPlaylist.name}
                    className="h-28 w-28 rounded-[24px] object-cover shadow-[0_26px_60px_rgba(0,0,0,0.32)] sm:h-36 sm:w-36 sm:rounded-[28px]"
                  />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.35em] text-brand-grey">
                      {selectedPlaylist.source === "spotify" ? "Spotify Playlist" : "Quaver Playlist"}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                      {selectedPlaylist.name}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-grey">
                      {selectedPlaylist.description}
                    </p>
                    {spotify.error ? (
                      <p className="mt-3 text-sm text-[#d8c58d]">{spotify.error}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 self-start lg:self-end">
                  <div className="rounded-full bg-white/[0.045] px-4 py-2 text-sm text-brand-grey">
                    {selectedPlaylist.tracks.length} Tracks
                  </div>
                  <div className="rounded-full bg-spotify-green/12 px-4 py-2 text-sm text-spotify-green">
                    Agent Ready
                  </div>
                  {spotify.isConfigured && !spotify.isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => void connectSpotify()}
                      className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-[#f3f3f3]"
                    >
                      Connect Spotify
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 hidden grid-cols-[56px_minmax(0,1fr)_140px_96px] gap-4 border-b border-white/[0.04] pb-3 text-xs uppercase tracking-[0.26em] text-brand-grey md:grid">
                <span>#</span>
                <span>Track</span>
                <span>Vibe</span>
                <span className="text-right">Length</span>
              </div>

              <div className="scrollbar-brand mt-2 flex-1 overflow-y-auto pr-2">
                {selectedPlaylist.tracks.length ? (
                  selectedPlaylist.tracks.map((track, index) => {
                    const isCurrent = currentTrack?.id === track.id;

                    return (
                      <motion.button
                        key={track.id}
                        type="button"
                        onClick={() => void playPlaylistTrack(selectedPlaylist, index)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setContextMenu({
                            x: event.clientX,
                            y: event.clientY,
                            track,
                          });
                        }}
                        className={`grid w-full grid-cols-[48px_minmax(0,1fr)_76px] items-center gap-3 rounded-[22px] px-2 py-3 text-left transition md:grid-cols-[56px_minmax(0,1fr)_140px_96px] md:gap-4 ${
                          isCurrent
                            ? "bg-[linear-gradient(135deg,rgba(29,185,84,0.18),rgba(255,255,255,0.04))] text-white"
                            : "text-white/90 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                              isCurrent
                                ? "bg-spotify-green text-brand-black"
                                : "bg-white/[0.045] text-brand-grey"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-3 md:gap-4">
                          <img
                            src={track.artwork}
                            alt={track.title}
                            className="h-12 w-12 rounded-2xl object-cover md:h-14 md:w-14"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{track.title}</p>
                            <p className="truncate text-sm text-brand-grey">
                              {track.artist} · {track.album}
                            </p>
                            <p className="mt-1 truncate text-xs capitalize text-brand-grey md:hidden">
                              {track.mood}
                            </p>
                          </div>
                        </div>
                        <div className="hidden items-center gap-2 text-sm md:flex">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: track.accent }}
                          />
                          <span className="capitalize text-brand-grey">{track.mood}</span>
                        </div>
                        <span className="text-right text-sm text-brand-grey">
                          {formatDuration(track.duration)}
                        </span>
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-[28px] bg-white/[0.03] text-brand-grey">
                    {selectedPlaylist.source === "spotify"
                      ? "正在从 Spotify 载入歌单内容..."
                      : "当前歌单还没有歌曲。"}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.section>

      <TrackContextMenu
        menu={contextMenu}
        playlists={playlists}
        onClose={() => setContextMenu(null)}
        onPlayNext={queueTrackNext}
        onAddToQueue={queueTrackLater}
        onAddToPlaylist={addTrackToPlaylist}
      />
    </main>
  );
}
