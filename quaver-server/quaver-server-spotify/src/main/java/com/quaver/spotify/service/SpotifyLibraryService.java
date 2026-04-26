package com.quaver.spotify.service;

import com.quaver.common.model.music.PlaylistView;
import com.quaver.common.model.music.TrackView;
import com.quaver.spotify.dto.SpotifyProfileDto;
import java.util.List;

public interface SpotifyLibraryService {

    SpotifyProfileDto getProfile();

    List<PlaylistView> listPlaylists(int limit);

    List<TrackView> listPlaylistTracks(String playlistId, int limit);
}
