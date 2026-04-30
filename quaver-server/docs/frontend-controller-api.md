# Quaver Frontend Backend Contract

Base URL in local development:

```text
http://localhost:8080/api
```

## Library Module

### `GET /library/bootstrap`

Returns the backend-managed library snapshot consumed by `useLibraryBootstrap`.

Response shape:

```json
{
  "playlists": [],
  "selectedPlaylistId": null,
  "playback": null,
  "serverTime": "2026-04-16T19:00:00"
}
```

An empty `playlists` array is a valid state. The backend no longer creates a default playlist.

### `POST /library/queue`

Appends a track to the backend queue.

Request body:

```json
{
  "trackId": "spotify-track-2takcwOaAZWiXQijPHIx7B"
}
```

### `POST /library/queue/next`

Inserts a track right after the current queue index.

Request body:

```json
{
  "trackId": "spotify-track-2takcwOaAZWiXQijPHIx7B"
}
```

### `POST /library/playback/start`

Starts or replaces the backend-managed playback session.

Request body:

```json
{
  "tracks": [],
  "startIndex": 0,
  "playbackSource": "backend"
}
```

### `PATCH /library/playback/state`

Updates playback session fields while preserving the current queue.

Request body:

```json
{
  "currentTrackIndex": 0,
  "isPlaying": true,
  "progress": 42,
  "volume": 72,
  "playbackSource": "backend",
  "isShuffleEnabled": false,
  "repeatMode": "off"
}
```

### `POST /library/playlists/{playlistId}/tracks`

Adds a track into a backend-managed playlist.

Request body:

```json
{
  "trackId": "spotify-track-2takcwOaAZWiXQijPHIx7B"
}
```

## Agent Module

### `GET /agent/conversations/default`

Returns a transient Agent session payload. Agent messages are not persisted.

### `POST /agent/conversations`

Creates a transient Agent session. No Agent conversation rows are stored in MySQL.

Request body:

```json
{
  "title": "Quaver Agent Session",
  "model": "deepseek-v4-pro",
  "spotifyDeveloperAccount": "developer@example.com",
  "metadata": {
    "workspace": "agent"
  }
}
```

### `POST /agent/conversations/{conversationId}/messages`

Parses a lightweight command intent and returns a transient assistant reply plus operation history. Messages are not saved to MySQL.

Request body:

```json
{
  "content": "给我播放 chill 粤语�?",
  "model": "deepseek-v4-pro",
  "spotifyDeveloperAccount": "developer@example.com",
  "metadata": {
    "workspace": "agent"
  }
}
```

### `POST /agent/conversations/{conversationId}/messages/stream`

Streams the same transient Agent response over SSE. The frontend uses this endpoint for live assistant deltas and receives a final payload with optional `libraryMutation` for playlist/queue/playback synchronization.

Request body:

```json
{
  "content": "把七里香加入歌单 夜跑",
  "model": "deepseek-v4-pro",
  "spotifyDeveloperAccount": "developer@example.com",
  "metadata": {
    "workspace": "agent",
    "selectedPlaylistId": "playlist-id"
  }
}
```

SSE event data shape:

```json
{
  "type": "assistant_delta",
  "delta": "正在处理"
}
```

### `POST /agent/search/tracks`

Natural-language track search endpoint used by `TrackSearchBar`.

Request body:

```json
{
  "query": "粤语 chill",
  "model": "deepseek-v4-pro",
  "limit": 8,
  "offset": 0,
  "selectedPlaylistId": null,
  "playlistIds": [],
  "queueTrackIds": [],
  "spotifyDeveloperAccount": "developer@example.com",
  "metadata": {
    "scope": "music_search",
    "workspace": "player_bar"
  }
}
```

Response shape:

```json
{
  "query": "粤语 chill",
  "tracks": [],
  "total": 0,
  "model": "deepseek-v4-pro",
  "requestId": "uuid",
  "status": "empty",
  "tookMs": 16
}
```

### `GET /agent/runtime-status`

Returns whether AI and Spotify bridge runtime prerequisites are configured.

Response shape:

```json
{
  "aiKeyConfigured": false,
  "aiModel": "deepseek-v4-pro",
  "aiSearchModel": "deepseek-v4-pro",
  "aiAgentModel": "deepseek-v4-pro",
  "aiBaseUrl": "https://api.deepseek.com",
  "spotifyBridgeEnabled": true,
  "spotifyBridgeAuthorized": false
}
```

## Spotify Module

### Auth

- `GET /spotify/auth/login`
- `GET /spotify/auth/callback?code=...&state=...`
- `GET /spotify/auth/status`
- `GET /spotify/auth/player-token`

Frontend should start Spotify connection by navigating the browser to
`/spotify/auth/login`. The backend owns the OAuth state, exchanges the callback
code, stores/refreshes tokens, and then redirects back to the configured
frontend base URL with `spotifyBridge=connected` or `spotifyBridge=error`.
If `quaver.spotify.bridge-refresh-token` is configured, `/spotify/auth/status`
can connect the backend bridge from that refresh token without browser-side
Spotify tokens.
`/spotify/auth/player-token` returns the short-lived bridge access token used
only by the Spotify Web Playback SDK so the browser can register itself as a
Spotify Connect playback device. It requires the `streaming` OAuth scope.

### Catalog

- `GET /spotify/me/profile`
- `GET /spotify/me/playlists?limit=24`
- `GET /spotify/playlists/{playlistId}/tracks?limit=50`
- `GET /spotify/tracks/search?q={query}&limit=8`
- `GET /spotify/tracks/{trackId}`

Track search and track lookup use Spotify application credentials and do not
require the bridge account OAuth flow to be completed first. Profile and
playlist endpoints use the backend-held bridge authorization. Collaborative
playlist track reads require `playlist-read-collaborative`, so reconnect Spotify
after adding that scope.

### Playback

- `GET /spotify/playback/state`
- `GET /spotify/playback/devices`
- `POST /spotify/playback/play`
- `POST /spotify/playback/pause`
- `POST /spotify/playback/next`
- `POST /spotify/playback/previous`
- `POST /spotify/playback/seek`
- `POST /spotify/playback/shuffle`
- `POST /spotify/playback/repeat`
- `POST /spotify/playback/volume`
- `POST /spotify/playback/queue`
- `POST /spotify/playback/playlists/{playlistId}/tracks`

These endpoints use the backend-held Spotify bridge authorization, not browser-side Spotify tokens.
Playback still requires an authorized Spotify account and a reachable Spotify device.

## Shared Model Notes

### Track

- `id`
- `title`
- `artist`
- `album`
- `duration`
- `artwork`
- `accent`
- `mood`
- `genres`
- `source`
- `spotifyId`
- `spotifyUri`
- `spotifyUrl`
- `lyrics`

### Playlist

- `id`
- `name`
- `description`
- `cover`
- `accent`
- `tracks`
- `source`
- `spotifyId`
- `spotifyUri`
- `ownerName`

### PlaybackState

- `queue`
- `currentTrackIndex`
- `isPlaying`
- `progress`
- `volume`
- `playbackSource`
- `isShuffleEnabled`
- `repeatMode`
