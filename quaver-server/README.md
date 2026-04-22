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

For local development, copy the example to either:

- `quaver-server/application-local.yml` when running Maven from `quaver-server/`
- `quaver-server-boot/src/main/resources/application-local.yml` when you prefer classpath resources

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

## Run

Start MySQL and Redis first, then run:

```bash
mvn -s .mvn-local-settings.xml -pl quaver-server-boot -am spring-boot:run
```

The API is served under:

```text
http://localhost:8080/api
```

To authorize the backend Spotify bridge account, open:

```text
http://localhost:8080/api/spotify/auth/login
```

## Boot Entry

Application entry:

- `quaver-server-boot/src/main/java/com/quaver/boot/QuaverServerApplication.java`
