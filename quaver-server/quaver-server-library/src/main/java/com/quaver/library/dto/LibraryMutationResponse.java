package com.quaver.library.dto;

import com.quaver.common.model.music.PlaybackStateView;
import com.quaver.common.model.music.PlaylistView;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LibraryMutationResponse {

    private boolean success;

    private String message;

    private PlaybackStateView playback;

    private List<PlaylistView> playlists;

    private String selectedPlaylistId;
}
