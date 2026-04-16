package com.quaver.library.service;

import com.quaver.common.model.music.PlaybackSource;
import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.TrackView;
import com.quaver.library.dto.LibraryBootstrapResponse;
import com.quaver.library.dto.LibraryMutationResponse;
import java.util.List;
import java.util.Optional;

public interface LibraryService {

    LibraryBootstrapResponse bootstrap();

    LibraryMutationResponse appendTrackToQueue(String trackId);

    LibraryMutationResponse insertTrackNext(String trackId);

    LibraryMutationResponse addTrackToPlaylist(String playlistId, String trackId);

    PlaybackStateView startPlayback(List<TrackView> queue, int startIndex, PlaybackSource playbackSource);

    TrackView cacheTrack(TrackView track);

    List<TrackView> cacheTracks(List<TrackView> tracks);

    Optional<TrackView> findTrack(String trackId);

    TrackView resolveTrack(String trackId);

    List<PlaylistView> listPlaylists();

    PlaybackStateView getPlaybackState();

    List<TrackView> searchCachedTracks(String query, int limit);
}
