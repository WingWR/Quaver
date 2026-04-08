import type { Playlist, Track } from "../types/music";

function createArtwork(label: string, start: string, end: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
      <rect width="320" height="320" rx="32" fill="${start}" />
      <circle cx="248" cy="72" r="92" fill="${end}" fill-opacity="0.92" />
      <circle cx="84" cy="262" r="128" fill="black" fill-opacity="0.28" />
      <path d="M70 108C70 88.1177 86.1178 72 106 72H214C233.882 72 250 88.1178 250 108V212C250 231.882 233.882 248 214 248H106C86.1177 248 70 231.882 70 212V108Z" fill="white" fill-opacity="0.08" />
      <path d="M118 220V132L214 114V198" stroke="white" stroke-opacity="0.92" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="116" cy="226" r="20" fill="white" fill-opacity="0.92"/>
      <circle cx="212" cy="204" r="20" fill="white" fill-opacity="0.92"/>
      <text x="36" y="288" fill="white" fill-opacity="0.95" font-family="Sora, Arial, sans-serif" font-size="30" font-weight="700">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const trackPool: Track[] = [
  {
    id: "track-night-drive",
    title: "Night Drive",
    artist: "Nova Echo",
    album: "Neon Static",
    duration: 234,
    artwork: createArtwork("ND", "#1DB954", "#0C4B28"),
    accent: "#1DB954",
    mood: "focus",
    genres: ["synthwave", "electronic"],
    source: "mock",
    lyrics: [
      { id: "nd-1", timestamp: 0, text: "City lights melt into the dashboard glow." },
      { id: "nd-2", timestamp: 18, text: "Every signal turns green when the code runs clean." },
      { id: "nd-3", timestamp: 36, text: "Midnight engines hum beneath a low horizon." },
      { id: "nd-4", timestamp: 54, text: "You keep moving while the static falls behind." },
      { id: "nd-5", timestamp: 72, text: "This lane is quiet enough to hear the future." },
    ],
  },
  {
    id: "track-afterglow",
    title: "Afterglow Scripts",
    artist: "Mira Lane",
    album: "Soft Compile",
    duration: 201,
    artwork: createArtwork("AS", "#4E5D94", "#171A2F"),
    accent: "#7C89E8",
    mood: "chill",
    genres: ["downtempo", "ambient"],
    source: "mock",
    lyrics: [
      { id: "ag-1", timestamp: 0, text: "Soft compile, let the noise resolve." },
      { id: "ag-2", timestamp: 22, text: "We leave room between the words to breathe." },
      { id: "ag-3", timestamp: 44, text: "Nothing breaks if we move with intention." },
      { id: "ag-4", timestamp: 66, text: "The afterglow carries the rest of the thought." },
    ],
  },
  {
    id: "track-glass-ocean",
    title: "Glass Ocean",
    artist: "The Quiet Array",
    album: "Blueprint Tides",
    duration: 268,
    artwork: createArtwork("GO", "#0F6B6B", "#041E23"),
    accent: "#56D6D6",
    mood: "deep",
    genres: ["ambient", "post-rock"],
    source: "mock",
    lyrics: [
      { id: "go-1", timestamp: 0, text: "Under glass water, the pulse slows down." },
      { id: "go-2", timestamp: 26, text: "Waves fold over blueprints we never sent." },
      { id: "go-3", timestamp: 52, text: "Every quiet instrument leaves a longer shadow." },
      { id: "go-4", timestamp: 78, text: "The ocean answers in reflections, not in words." },
    ],
  },
  {
    id: "track-signal-bloom",
    title: "Signal Bloom",
    artist: "Pulse Harbor",
    album: "Vector Hearts",
    duration: 188,
    artwork: createArtwork("SB", "#D5633C", "#44130B"),
    accent: "#F19766",
    mood: "boost",
    genres: ["indie pop", "electronic"],
    source: "mock",
    lyrics: [
      { id: "sb-1", timestamp: 0, text: "Wake the signal, let the circuit bloom." },
      { id: "sb-2", timestamp: 20, text: "Fast hands, bright screens, zero hesitation." },
      { id: "sb-3", timestamp: 40, text: "We trade the silence for a sharper rhythm." },
      { id: "sb-4", timestamp: 60, text: "Everything lifts when the chorus lands." },
    ],
  },
  {
    id: "track-pixel-rain",
    title: "Pixel Rain",
    artist: "Circuit Bloom",
    album: "Grey Rooms",
    duration: 216,
    artwork: createArtwork("PR", "#5F6B7A", "#191C21"),
    accent: "#C0D0E0",
    mood: "chill",
    genres: ["lofi", "beats"],
    source: "mock",
    lyrics: [
      { id: "pr-1", timestamp: 0, text: "Pixel rain on the window of the tab you left open." },
      { id: "pr-2", timestamp: 24, text: "Some thoughts sound better at half-speed." },
      { id: "pr-3", timestamp: 48, text: "Grey rooms still glow when the beat is warm." },
    ],
  },
  {
    id: "track-breathing-room",
    title: "Breathing Room",
    artist: "Sora Vale",
    album: "Low Light",
    duration: 254,
    artwork: createArtwork("BR", "#2A8A6A", "#081914"),
    accent: "#68D4A8",
    mood: "focus",
    genres: ["house", "minimal"],
    source: "mock",
    lyrics: [
      { id: "br-1", timestamp: 0, text: "Take one more second before the system spins up." },
      { id: "br-2", timestamp: 24, text: "A breathing room is still part of the design." },
      { id: "br-3", timestamp: 48, text: "The floor keeps time while the head clears out." },
    ],
  },
  {
    id: "track-lucid-code",
    title: "Lucid Code",
    artist: "Parallel Kids",
    album: "Draft State",
    duration: 229,
    artwork: createArtwork("LC", "#8052EC", "#25114A"),
    accent: "#BA9CFF",
    mood: "boost",
    genres: ["future bass", "pop"],
    source: "mock",
    lyrics: [
      { id: "lc-1", timestamp: 0, text: "Every lucid line lands like a clean commit." },
      { id: "lc-2", timestamp: 21, text: "We turn the draft state into something loud." },
      { id: "lc-3", timestamp: 42, text: "No rollback, no doubt, just velocity." },
    ],
  },
  {
    id: "track-slow-current",
    title: "Slow Current",
    artist: "Amber Signals",
    album: "Quiet Weather",
    duration: 245,
    artwork: createArtwork("SC", "#A08D58", "#302712"),
    accent: "#F0D98A",
    mood: "deep",
    genres: ["soul", "jazz"],
    source: "mock",
    lyrics: [
      { id: "sc-1", timestamp: 0, text: "The current moves slow enough to feel." },
      { id: "sc-2", timestamp: 28, text: "Brass in the distance, patience in the room." },
      { id: "sc-3", timestamp: 56, text: "What stays quiet usually lasts longer." },
    ],
  },
];

function pick(...ids: string[]) {
  return ids
    .map((id) => trackPool.find((track) => track.id === id))
    .filter((track): track is Track => Boolean(track));
}

export const mockPlaylists: Playlist[] = [
  {
    id: "playlist-focused-loop",
    name: "Focused Loop",
    description: "低饱和电子与极简律动，适合长时间深度工作。",
    cover: createArtwork("FL", "#1B7D4E", "#07130D"),
    accent: "#1DB954",
    tracks: pick(
      "track-night-drive",
      "track-breathing-room",
      "track-glass-ocean",
      "track-slow-current",
    ),
    source: "mock",
  },
  {
    id: "playlist-soft-launch",
    name: "Soft Launch",
    description: "更柔和的节奏与暖色氛围，适合切到聊天或梳理思路。",
    cover: createArtwork("SL", "#585B7E", "#181A28"),
    accent: "#9CAAFB",
    tracks: pick(
      "track-afterglow",
      "track-pixel-rain",
      "track-slow-current",
      "track-glass-ocean",
    ),
    source: "mock",
  },
  {
    id: "playlist-agent-boost",
    name: "Agent Boost",
    description: "高能量电子与明亮合成器，适合快速切任务。",
    cover: createArtwork("AB", "#AD542C", "#311006"),
    accent: "#F19766",
    tracks: pick(
      "track-signal-bloom",
      "track-lucid-code",
      "track-night-drive",
      "track-breathing-room",
    ),
    source: "mock",
  },
];

export const mockQueue = [
  mockPlaylists[0].tracks[0],
  mockPlaylists[2].tracks[0],
  mockPlaylists[1].tracks[1],
  mockPlaylists[0].tracks[1],
  mockPlaylists[1].tracks[0],
];

export const allTracks = trackPool;
