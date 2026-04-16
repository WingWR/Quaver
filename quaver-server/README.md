# Quaver Server

Spring Boot backend for Quaver, organized as a parent-child Maven project.

## Modules

- `quaver-server-common`: shared config, user context, music view models, exceptions
- `quaver-server-spotify`: Spotify bridge auth, catalog search, playback control
- `quaver-server-library`: backend playlists, queue state, playback session persistence
- `quaver-server-agent`: conversation storage, lightweight command parsing, agent search
- `quaver-server-boot`: executable application, global config, SQL bootstrap

## Configuration

Main runtime config lives in:

- `quaver-server-boot/src/main/resources/application.yml`
- `quaver-server-boot/src/main/resources/application-local.example.yml`

Supported config areas:

- frontend origin / CORS
- backend API key
- agent API key
- AI model and API key
- MySQL datasource
- Redis connection
- Spotify developer account and bridge credentials

## Build

From `quaver-server/`:

```bash
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am test
```

## Boot Entry

Application entry:

- `quaver-server-boot/src/main/java/com/quaver/boot/QuaverServerApplication.java`
