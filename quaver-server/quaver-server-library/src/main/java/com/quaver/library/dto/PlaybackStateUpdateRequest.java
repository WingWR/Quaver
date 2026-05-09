package com.quaver.library.dto;

import com.quaver.common.model.music.TrackView;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlaybackStateUpdateRequest {

    private List<TrackView> queue;

    private Integer currentTrackIndex;

    private Boolean isPlaying;

    private Integer progress;

    private Integer volume;

    private String playbackSource;

    private Boolean isShuffleEnabled;

    private String repeatMode;
}
