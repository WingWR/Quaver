# Quaver Server

Spring Boot backend for Quaver, organized as a parent-child Maven project.

## Modules

- `quaver-server-common`: shared config, user context, music view models, exceptions
- `quaver-server-spotify`: Spotify bridge auth, catalog search, playback control
- `quaver-server-library`: backend playlists, queue state, playback session persistence
- `quaver-server-agent`: conversation storage, lightweight command parsing, agent search
- `quaver-server-boot`: executable application, global config, SQL bootstrap

## Configuration

Main runtime structure lives in:

- `quaver-server-boot/src/main/resources/application.yml`

Local private values live in ignored env files:

- `quaver-server/.env`
- `quaver-server/.env.example` as the safe template

Supported config areas:

- frontend origin / CORS
- backend API key
- agent API key
- DeepSeek API key
- MySQL datasource
- Redis connection
- Spotify developer account and bridge credentials

Spotify OAuth, token refresh, catalog calls, playlist reads, and playback calls
are handled on the backend. The frontend only redirects to the backend login
entrypoint and displays backend state. Catalog search uses application
credentials through Client Credentials; playback control still requires bridge
account authorization and a reachable playback device.

The first bridge authorization must be completed once in the browser because
Spotify user playback and private library APIs require account consent. After
that, Quaver stores the refresh token in `qv_spotify_authorization` and refreshes
access tokens on the backend automatically. If you already have a Spotify
refresh token, put it in `QUAVER_SPOTIFY_BRIDGE_REFRESH_TOKEN` and the backend
will connect from that token without opening the browser.

## Build

From `quaver-server/`:

```bash
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am test
```

## Run

Start MySQL and Redis first, then run:

```bash
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am spring-boot:run
```

The API is served under:

```text
http://127.0.0.1:8080/api
```

To authorize the backend Spotify bridge account, open:

```text
http://127.0.0.1:8080/api/spotify/auth/login
```

Register this exact redirect URI in Spotify Developer Dashboard:

```text
http://127.0.0.1:8080/api/spotify/auth/callback
```

For Spotify apps still in development mode, add the bridge account email under
the Spotify app's user access settings. Playback control also requires a Spotify
Premium account and at least one active Spotify device.

Spotify does not let a backend create a playback device for an account. A device
is created only when Spotify is open on desktop, mobile, or the Spotify Web
Player. Quaver will choose a device automatically in this order:

- request `deviceId`
- `QUAVER_SPOTIFY_DEFAULT_DEVICE_ID`
- active Spotify Connect device
- first unrestricted Spotify Connect device

To pin a default device, authorize Spotify once, open Spotify on the device you
want to use, call:

```text
GET http://127.0.0.1:8080/api/spotify/playback/devices
```

Copy the device `id` into `quaver-server/.env`:

```properties
QUAVER_SPOTIFY_DEFAULT_DEVICE_ID=your-device-id
```

## Boot Entry

Application entry:

- `quaver-server-boot/src/main/java/com/quaver/boot/QuaverServerApplication.java`
