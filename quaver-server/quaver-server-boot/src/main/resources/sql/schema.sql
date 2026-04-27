CREATE TABLE IF NOT EXISTS qv_user (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) NOT NULL UNIQUE,
    preferences JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qv_track (
    id VARCHAR(128) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255) NOT NULL,
    duration INT NOT NULL DEFAULT 0,
    artwork TEXT NULL,
    accent VARCHAR(32) NULL,
    mood VARCHAR(64) NULL,
    genres JSON NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'backend',
    spotify_id VARCHAR(128) NULL,
    spotify_uri VARCHAR(255) NULL,
    spotify_url VARCHAR(255) NULL,
    lyrics JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qv_track_spotify_id (spotify_id)
);

CREATE TABLE IF NOT EXISTS qv_playlist (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cover TEXT NULL,
    accent VARCHAR(32) NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'backend',
    spotify_id VARCHAR(128) NULL,
    spotify_uri VARCHAR(255) NULL,
    owner_name VARCHAR(128) NULL,
    version INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_qv_playlist_user FOREIGN KEY (user_id) REFERENCES qv_user (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qv_playlist_track (
    id VARCHAR(128) PRIMARY KEY,
    playlist_id VARCHAR(128) NOT NULL,
    track_id VARCHAR(128) NOT NULL,
    position INT NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qv_playlist_track_playlist FOREIGN KEY (playlist_id) REFERENCES qv_playlist (id) ON DELETE CASCADE,
    CONSTRAINT fk_qv_playlist_track_track FOREIGN KEY (track_id) REFERENCES qv_track (id) ON DELETE CASCADE,
    CONSTRAINT uk_qv_playlist_track UNIQUE (playlist_id, track_id)
);

CREATE TABLE IF NOT EXISTS qv_playback_session (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    queue_track_ids JSON NULL,
    current_track_index INT NOT NULL DEFAULT 0,
    is_playing BOOLEAN NOT NULL DEFAULT FALSE,
    progress INT NOT NULL DEFAULT 0,
    volume INT NOT NULL DEFAULT 72,
    playback_source VARCHAR(32) NOT NULL DEFAULT 'backend',
    is_shuffle_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    repeat_mode VARCHAR(32) NOT NULL DEFAULT 'off',
    active_playlist_id VARCHAR(128) NULL,
    device_id VARCHAR(128) NULL,
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_qv_playback_session_user FOREIGN KEY (user_id) REFERENCES qv_user (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qv_spotify_authorization (
    id VARCHAR(64) PRIMARY KEY,
    developer_account VARCHAR(128) NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NULL,
    token_type VARCHAR(32) NULL,
    scopes JSON NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS qv_agent_message;
DROP TABLE IF EXISTS qv_agent_conversation;
