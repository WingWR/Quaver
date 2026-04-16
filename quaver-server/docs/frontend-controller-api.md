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
  "playlists": [
    {
      "id": "playlist-demo-user-default",
      "name": "Backend Favorites",
      "description": "Your backend-managed playlist.",
      "cover": "data:image/svg+xml,...",
      "accent": "#1DB954",
      "tracks": [],
      "source": "backend",
      "spotifyId": null,
      "spotifyUri": null,
      "ownerName": null
    }
  ],
  "selectedPlaylistId": "playlist-demo-user-default",
  "playback": {
    "queue": [],
    "currentTrackIndex": 0,
    "isPlaying": false,
    "progress": 0,
    "volume": 72,
    "playbackSource": "backend",
    "isShuffleEnabled": false,
    "repeatMode": "off"
  },
  "serverTime": "2026-04-16T19:00:00"
}
```

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

Returns the default conversation for the configured Quaver default user.

### `POST /agent/conversations`

Creates a conversation.

Request body:

```json
{
  "title": "Quaver Agent Session",
  "model": "gpt-4.1-mini",
  "spotifyDeveloperAccount": "developer-account",
  "metadata": {
    "workspace": "agent"
  }
}
```

### `POST /agent/conversations/{conversationId}/messages`

Stores the user message, parses a lightweight command intent, and returns a persisted assistant reply plus operation history.

Request body:

```json
{
  "content": "给我播放 chill 粤语歌",
  "model": "gpt-4.1-mini",
  "spotifyDeveloperAccount": "developer-account",
  "metadata": {
    "workspace": "agent"
  }
}
```

### `POST /agent/search/tracks`

Natural-language track search endpoint used by `TrackSearchBar`.

Request body:

```json
{
  "query": "粤语 chill",
  "model": "gpt-4.1-mini",
  "limit": 8,
  "selectedPlaylistId": "playlist-demo-user-default",
  "playlistIds": [
    "playlist-demo-user-default"
  ],
  "queueTrackIds": [],
  "spotifyDeveloperAccount": "developer-account",
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
  "model": "gpt-4.1-mini",
  "requestId": "uuid",
  "status": "empty",
  "tookMs": 16
}
```

### `GET /agent/runtime-status`

Returns whether AI and Spotify bridge runtime prerequisites are configured.

## Spotify Module

### Auth

- `GET /spotify/auth/login`
- `GET /spotify/auth/callback?code=...&state=...`
- `GET /spotify/auth/status`

### Catalog

- `GET /spotify/tracks/search?q={query}&limit=8`
- `GET /spotify/tracks/{trackId}`

### Playback

- `GET /spotify/playback/state`
- `POST /spotify/playback/play`
- `POST /spotify/playback/pause`
- `POST /spotify/playback/next`
- `POST /spotify/playback/previous`
- `POST /spotify/playback/seek`
- `POST /spotify/playback/shuffle`
- `POST /spotify/playback/repeat`
- `POST /spotify/playback/queue`
- `POST /spotify/playback/playlists/{playlistId}/tracks`

These endpoints use the backend-held Spotify bridge authorization, not browser-side Spotify tokens.

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
