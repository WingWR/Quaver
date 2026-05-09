package com.quaver.library.service;

import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.RepeatMode;
import com.quaver.common.model.music.TrackView;
import com.quaver.library.dto.LibraryBootstrapResponse;
import com.quaver.library.dto.LibraryMutationResponse;
import java.util.List;
import java.util.Optional;

public interface LibraryService {

    LibraryBootstrapResponse bootstrap();

    LibraryMutationResponse appendTrackToQueue(String trackId);

    LibraryMutationResponse insertTrackNext(String trackId);

    LibraryMutationResponse removeTrackFromQueue(String trackId);

    LibraryMutationResponse clearQueue();

    LibraryMutationResponse createPlaylist(String name, String description);

    LibraryMutationResponse updatePlaylist(String playlistId, String name, String description);

    LibraryMutationResponse deletePlaylist(String playlistId);

    LibraryMutationResponse addTrackToPlaylist(String playlistId, String trackId);

    PlaybackStateView startPlayback(List<TrackView> queue, int startIndex, PlaybackSource playbackSource);

    PlaybackStateView updatePlaybackState(List<TrackView> queue, Integer currentTrackIndex, Boolean isPlaying, Integer progress, Integer volume,
                                          PlaybackSource playbackSource, Boolean isShuffleEnabled, RepeatMode repeatMode);

    TrackView cacheTrack(TrackView track);

    List<TrackView> cacheTracks(List<TrackView> tracks);

    Optional<TrackView> findTrack(String trackId);

    TrackView resolveTrack(String trackId);

    List<PlaylistView> listPlaylists();

    PlaybackStateView getPlaybackState();

    List<TrackView> searchCachedTracks(String query, int limit);
}
