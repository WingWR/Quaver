package com.quaver.spotify.service;

import com.quaver.common.model.music.TrackView;
import java.util.List;
import java.util.Optional;

public interface SpotifyCatalogService {

    List<TrackView> searchTracks(String query, int limit);

    Optional<TrackView> getTrack(String trackId);
}
