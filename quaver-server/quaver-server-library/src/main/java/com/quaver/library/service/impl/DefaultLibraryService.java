package com.quaver.library.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.quaver.common.exception.NotFoundException;
import com.quaver.common.identity.UserContextService;
import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.RepeatMode;
import com.quaver.common.model.music.TrackView;
import com.quaver.common.support.RedisKeys;
import com.quaver.library.dto.LibraryBootstrapResponse;
import com.quaver.library.dto.LibraryMutationResponse;
import com.quaver.library.entity.PlaybackSessionEntity;
import com.quaver.library.entity.PlaylistEntity;
import com.quaver.library.entity.PlaylistTrackEntity;
import com.quaver.library.entity.TrackEntity;
import com.quaver.library.mapper.PlaybackSessionMapper;
import com.quaver.library.mapper.PlaylistMapper;
import com.quaver.library.mapper.PlaylistTrackMapper;
import com.quaver.library.mapper.TrackMapper;
import com.quaver.library.service.LibraryService;
import com.quaver.spotify.service.SpotifyCatalogService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DefaultLibraryService implements LibraryService {

    private final UserContextService userContextService;
    private final TrackMapper trackMapper;
    private final PlaylistMapper playlistMapper;
    private final PlaylistTrackMapper playlistTrackMapper;
    private final PlaybackSessionMapper playbackSessionMapper;
    private final StringRedisTemplate stringRedisTemplate;
    private final SpotifyCatalogService spotifyCatalogService;
    private final Clock clock;

    public DefaultLibraryService(
            UserContextService userContextService,
            TrackMapper trackMapper,
            PlaylistMapper playlistMapper,
            PlaylistTrackMapper playlistTrackMapper,
            PlaybackSessionMapper playbackSessionMapper,
            StringRedisTemplate stringRedisTemplate,
            SpotifyCatalogService spotifyCatalogService,
            Clock clock
    ) {
        this.userContextService = userContextService;
        this.trackMapper = trackMapper;
        this.playlistMapper = playlistMapper;
        this.playlistTrackMapper = playlistTrackMapper;
        this.playbackSessionMapper = playbackSessionMapper;
        this.stringRedisTemplate = stringRedisTemplate;
        this.spotifyCatalogService = spotifyCatalogService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public LibraryBootstrapResponse bootstrap() {
        String userId = userContextService.getCurrentUserId();
        removeEmptyLegacyDefaultPlaylist(userId);
        List<PlaylistView> playlists = listPlaylists();
        PlaybackStateView playbackState = getPlaybackState();
        return new LibraryBootstrapResponse(
                playlists,
                playlists.isEmpty() ? null : playlists.getFirst().id(),
                playbackState,
                LocalDateTime.now(clock).toString()
        );
    }

    @Override
    @Transactional
    public LibraryMutationResponse appendTrackToQueue(String trackId) {
        TrackView track = resolveTrack(trackId);
        PlaybackStateView playbackState = getPlaybackStateOrDefault();
        List<TrackView> queue = new ArrayList<>(playbackState.queue());
        boolean exists = queue.stream().anyMatch(item -> item.id().equals(track.id()));
        if (!exists) {
            queue.add(track);
        }
        PlaybackStateView saved = persistPlaybackState(queue, playbackState.currentTrackIndex(), playbackState.isPlaying(),
                playbackState.progress(), playbackState.volume(), playbackState.playbackSource(),
                playbackState.isShuffleEnabled(), playbackState.repeatMode(), null, playbackState);
        return new LibraryMutationResponse(true, exists ? "Track already in queue." : "Track appended to queue.", saved, null);
    }

    @Override
    @Transactional
    public LibraryMutationResponse insertTrackNext(String trackId) {
        TrackView track = resolveTrack(trackId);
        PlaybackStateView playbackState = getPlaybackStateOrDefault();
        List<TrackView> queue = new ArrayList<>(playbackState.queue());
        if (queue.isEmpty()) {
            queue.add(track);
            PlaybackStateView saved = persistPlaybackState(queue, 0, true, 0, playbackState.volume(),
                    PlaybackSource.BACKEND, playbackState.isShuffleEnabled(), playbackState.repeatMode(), null, playbackState);
            return new LibraryMutationResponse(true, "Track inserted into queue.", saved, null);
        }

        queue.removeIf(item -> item.id().equals(track.id()));
        int insertIndex = Math.min(playbackState.currentTrackIndex() + 1, queue.size());
        queue.add(insertIndex, track);
        PlaybackStateView saved = persistPlaybackState(queue, playbackState.currentTrackIndex(), playbackState.isPlaying(),
                playbackState.progress(), playbackState.volume(), playbackState.playbackSource(),
                playbackState.isShuffleEnabled(), playbackState.repeatMode(), null, playbackState);
        return new LibraryMutationResponse(true, "Track inserted next.", saved, null);
    }

    @Override
    @Transactional
    public LibraryMutationResponse addTrackToPlaylist(String playlistId, String trackId) {
        String userId = userContextService.getCurrentUserId();
        PlaylistEntity playlistEntity = playlistMapper.selectById(playlistId);
        if (playlistEntity == null || !Objects.equals(userId, playlistEntity.getUserId())) {
            throw new NotFoundException("Playlist does not exist.");
        }

        TrackView track = resolveTrack(trackId);
        PlaylistTrackEntity existingRelation = playlistTrackMapper.selectOne(Wrappers.lambdaQuery(PlaylistTrackEntity.class)
                .eq(PlaylistTrackEntity::getPlaylistId, playlistId)
                .eq(PlaylistTrackEntity::getTrackId, track.id())
                .last("limit 1"));

        if (existingRelation == null) {
            Integer maxPosition = playlistTrackMapper.selectList(Wrappers.lambdaQuery(PlaylistTrackEntity.class)
                            .eq(PlaylistTrackEntity::getPlaylistId, playlistId))
                    .stream()
                    .map(PlaylistTrackEntity::getPosition)
                    .max(Integer::compareTo)
                    .orElse(-1);

            PlaylistTrackEntity relation = new PlaylistTrackEntity();
            relation.setId(UUID.randomUUID().toString());
            relation.setPlaylistId(playlistId);
            relation.setTrackId(track.id());
            relation.setPosition(maxPosition + 1);
            playlistTrackMapper.insert(relation);
        }

        return new LibraryMutationResponse(true, "Track saved to playlist.", getPlaybackState(), listPlaylists());
    }

    @Override
    @Transactional
    public PlaybackStateView startPlayback(List<TrackView> queue, int startIndex, PlaybackSource playbackSource) {
        List<TrackView> persistedQueue = cacheTracks(queue);
        return persistPlaybackState(
                persistedQueue,
                clampIndex(startIndex, persistedQueue),
                !persistedQueue.isEmpty(),
                0,
                72,
                playbackSource,
                false,
                RepeatMode.OFF,
                null,
                null
        );
    }

    @Override
    @Transactional
    public PlaybackStateView updatePlaybackState(Integer currentTrackIndex, Boolean isPlaying, Integer progress, Integer volume,
                                                 PlaybackSource playbackSource, Boolean isShuffleEnabled, RepeatMode repeatMode) {
        PlaybackStateView currentState = getPlaybackStateOrDefault();
        return persistPlaybackState(
                currentState.queue(),
                currentTrackIndex == null ? currentState.currentTrackIndex() : currentTrackIndex,
                isPlaying == null ? currentState.isPlaying() : isPlaying,
                progress == null ? currentState.progress() : Math.max(progress, 0),
                volume == null ? currentState.volume() : clampVolume(volume),
                playbackSource == null ? currentState.playbackSource() : playbackSource,
                isShuffleEnabled == null ? currentState.isShuffleEnabled() : isShuffleEnabled,
                repeatMode == null ? currentState.repeatMode() : repeatMode,
                null,
                currentState
        );
    }

    @Override
    @Transactional
    public TrackView cacheTrack(TrackView track) {
        TrackEntity entity = trackMapper.selectById(track.id());
        if (entity == null) {
            entity = new TrackEntity();
            entity.setId(track.id());
        }
        entity.setTitle(track.title());
        entity.setArtist(track.artist());
        entity.setAlbum(track.album());
        entity.setDuration(track.duration());
        entity.setArtwork(track.artwork());
        entity.setAccent(track.accent());
        entity.setMood(track.mood());
        entity.setGenres(track.genres());
        entity.setSource((track.source() == null ? PlaybackSource.BACKEND : track.source()).getValue());
        entity.setSpotifyId(track.spotifyId());
        entity.setSpotifyUri(track.spotifyUri());
        entity.setSpotifyUrl(track.spotifyUrl());
        entity.setLyrics(track.lyrics() == null ? List.of() : track.lyrics());
        if (trackMapper.selectById(track.id()) == null) {
            trackMapper.insert(entity);
        } else {
            trackMapper.updateById(entity);
        }
        return toTrackView(entity);
    }

    @Override
    @Transactional
    public List<TrackView> cacheTracks(List<TrackView> tracks) {
        if (tracks == null || tracks.isEmpty()) {
            return List.of();
        }
        return tracks.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(TrackView::id, this::cacheTrack, (left, right) -> right, LinkedHashMap::new),
                        map -> new ArrayList<>(map.values())
                ));
    }

    @Override
    public Optional<TrackView> findTrack(String trackId) {
        TrackEntity entity = trackMapper.selectById(trackId);
        return Optional.ofNullable(entity).map(this::toTrackView);
    }

    @Override
    @Transactional
    public TrackView resolveTrack(String trackId) {
        Optional<TrackView> local = findTrack(trackId);
        if (local.isPresent()) {
            return local.get();
        }
        return spotifyCatalogService.getTrack(trackId)
                .map(this::cacheTrack)
                .orElseThrow(() -> new NotFoundException("Track not found."));
    }

    @Override
    public List<PlaylistView> listPlaylists() {
        String userId = userContextService.getCurrentUserId();
        List<PlaylistEntity> playlistEntities = playlistMapper.selectList(Wrappers.lambdaQuery(PlaylistEntity.class)
                .eq(PlaylistEntity::getUserId, userId)
                .orderByDesc(PlaylistEntity::getCreatedAt));

        if (playlistEntities.isEmpty()) {
            return List.of();
        }

        List<String> playlistIds = playlistEntities.stream().map(PlaylistEntity::getId).toList();
        List<PlaylistTrackEntity> relations = playlistTrackMapper.selectList(Wrappers.lambdaQuery(PlaylistTrackEntity.class)
                .in(PlaylistTrackEntity::getPlaylistId, playlistIds)
                .orderByAsc(PlaylistTrackEntity::getPosition));

        List<String> trackIds = relations.stream().map(PlaylistTrackEntity::getTrackId).distinct().toList();
        Map<String, TrackView> tracksById = trackIds.isEmpty()
                ? Map.of()
                : trackMapper.selectBatchIds(trackIds).stream()
                .map(this::toTrackView)
                .collect(Collectors.toMap(TrackView::id, track -> track));

        Map<String, List<TrackView>> playlistTracks = new LinkedHashMap<>();
        for (PlaylistTrackEntity relation : relations) {
            TrackView track = tracksById.get(relation.getTrackId());
            if (track != null) {
                playlistTracks.computeIfAbsent(relation.getPlaylistId(), ignored -> new ArrayList<>()).add(track);
            }
        }

        return playlistEntities.stream()
                .map(playlist -> new PlaylistView(
                        playlist.getId(),
                        playlist.getName(),
                        playlist.getDescription(),
                        playlist.getCover(),
                        playlist.getAccent(),
                        playlistTracks.getOrDefault(playlist.getId(), List.of()),
                        PlaybackSource.fromValue(playlist.getSource()),
                        playlist.getSpotifyId(),
                        playlist.getSpotifyUri(),
                        playlist.getOwnerName()
                ))
                .toList();
    }

    @Override
    public PlaybackStateView getPlaybackState() {
        String userId = userContextService.getCurrentUserId();
        PlaybackSessionEntity session = playbackSessionMapper.selectOne(Wrappers.lambdaQuery(PlaybackSessionEntity.class)
                .eq(PlaybackSessionEntity::getUserId, userId)
                .last("limit 1"));
        if (session == null) {
            return null;
        }

        List<String> queueTrackIds = Optional.ofNullable(stringRedisTemplate.opsForList().range(RedisKeys.queue(userId), 0, -1))
                .filter(list -> !list.isEmpty())
                .orElse(session.getQueueTrackIds() == null ? List.of() : session.getQueueTrackIds());

        List<TrackView> queue = queueTrackIds.isEmpty()
                ? List.of()
                : trackMapper.selectBatchIds(queueTrackIds).stream()
                .sorted(Comparator.comparingInt(track -> queueTrackIds.indexOf(track.getId())))
                .map(this::toTrackView)
                .toList();

        return new PlaybackStateView(
                queue,
                clampIndex(Optional.ofNullable(session.getCurrentTrackIndex()).orElse(0), queue),
                Boolean.TRUE.equals(session.getIsPlaying()),
                Optional.ofNullable(session.getProgress()).orElse(0),
                Optional.ofNullable(session.getVolume()).orElse(72),
                PlaybackSource.fromValue(session.getPlaybackSource()),
                Boolean.TRUE.equals(session.getIsShuffleEnabled()),
                RepeatMode.fromValue(session.getRepeatMode())
        );
    }

    @Override
    public List<TrackView> searchCachedTracks(String query, int limit) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String normalizedQuery = query.trim().toLowerCase();
        return trackMapper.selectList(Wrappers.lambdaQuery(TrackEntity.class)
                        .orderByDesc(TrackEntity::getUpdatedAt))
                .stream()
                .map(this::toTrackView)
                .filter(track ->
                        containsIgnoreCase(track.title(), normalizedQuery)
                                || containsIgnoreCase(track.artist(), normalizedQuery)
                                || containsIgnoreCase(track.album(), normalizedQuery)
                                || containsIgnoreCase(track.mood(), normalizedQuery)
                                || track.genres().stream().anyMatch(genre -> containsIgnoreCase(genre, normalizedQuery)))
                .limit(Math.max(limit, 1L))
                .toList();
    }

    private PlaybackStateView getPlaybackStateOrDefault() {
        PlaybackStateView state = getPlaybackState();
        return state == null
                ? new PlaybackStateView(List.of(), 0, false, 0, 72, PlaybackSource.BACKEND, false, RepeatMode.OFF)
                : state;
    }

    private PlaybackStateView persistPlaybackState(
            List<TrackView> queue,
            int currentTrackIndex,
            boolean isPlaying,
            int progress,
            int volume,
            PlaybackSource playbackSource,
            boolean isShuffleEnabled,
            RepeatMode repeatMode,
            String activePlaylistId,
            PlaybackStateView existingState
    ) {
        String userId = userContextService.getCurrentUserId();
        List<TrackView> normalizedQueue = queue == null ? List.of() : queue.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(TrackView::id, track -> track, (left, right) -> left, LinkedHashMap::new),
                        map -> new ArrayList<>(map.values())
                ));

        List<String> queueTrackIds = normalizedQueue.stream().map(TrackView::id).toList();
        stringRedisTemplate.delete(RedisKeys.queue(userId));
        if (!queueTrackIds.isEmpty()) {
            stringRedisTemplate.opsForList().rightPushAll(RedisKeys.queue(userId), queueTrackIds);
        }

        PlaybackSessionEntity session = playbackSessionMapper.selectOne(Wrappers.lambdaQuery(PlaybackSessionEntity.class)
                .eq(PlaybackSessionEntity::getUserId, userId)
                .last("limit 1"));
        if (session == null) {
            session = new PlaybackSessionEntity();
            session.setId("session-" + userId);
            session.setUserId(userId);
        }
        session.setQueueTrackIds(queueTrackIds);
        session.setCurrentTrackIndex(clampIndex(currentTrackIndex, normalizedQueue));
        session.setIsPlaying(isPlaying);
        session.setProgress(progress);
        session.setVolume(volume);
        session.setPlaybackSource(playbackSource.getValue());
        session.setIsShuffleEnabled(isShuffleEnabled);
        session.setRepeatMode(repeatMode.getValue());
        session.setActivePlaylistId(activePlaylistId);
        session.setDeviceId(existingState == null ? null : null);
        session.setLastUpdated(LocalDateTime.now(clock));
        if (playbackSessionMapper.selectById(session.getId()) == null) {
            playbackSessionMapper.insert(session);
        } else {
            playbackSessionMapper.updateById(session);
        }

        return new PlaybackStateView(
                normalizedQueue,
                clampIndex(currentTrackIndex, normalizedQueue),
                isPlaying,
                progress,
                volume,
                playbackSource,
                isShuffleEnabled,
                repeatMode
        );
    }

    private void removeEmptyLegacyDefaultPlaylist(String userId) {
        String legacyPlaylistId = "playlist-" + userId + "-default";
        PlaylistEntity playlist = playlistMapper.selectById(legacyPlaylistId);
        if (playlist == null) {
            return;
        }

        Long trackCount = playlistTrackMapper.selectCount(Wrappers.lambdaQuery(PlaylistTrackEntity.class)
                .eq(PlaylistTrackEntity::getPlaylistId, legacyPlaylistId));
        if (trackCount == null || trackCount == 0) {
            playlistMapper.deleteById(legacyPlaylistId);
        }
    }

    private TrackView toTrackView(TrackEntity entity) {
        return new TrackView(
                entity.getId(),
                entity.getTitle(),
                entity.getArtist(),
                entity.getAlbum(),
                Optional.ofNullable(entity.getDuration()).orElse(0),
                entity.getArtwork(),
                entity.getAccent(),
                entity.getMood(),
                entity.getGenres() == null ? Collections.emptyList() : entity.getGenres(),
                PlaybackSource.fromValue(entity.getSource()),
                entity.getSpotifyId(),
                entity.getSpotifyUri(),
                entity.getSpotifyUrl(),
                entity.getLyrics() == null ? List.of() : entity.getLyrics()
        );
    }

    private int clampIndex(int desiredIndex, List<TrackView> queue) {
        if (queue == null || queue.isEmpty()) {
            return 0;
        }
        if (desiredIndex < 0) {
            return 0;
        }
        return Math.min(desiredIndex, queue.size() - 1);
    }

    private int clampVolume(int desiredVolume) {
        return Math.max(0, Math.min(100, desiredVolume));
    }

    private boolean containsIgnoreCase(String value, String query) {
        return value != null && value.toLowerCase().contains(query);
    }
}
