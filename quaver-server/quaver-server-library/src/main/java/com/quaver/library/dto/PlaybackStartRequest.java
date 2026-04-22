package com.quaver.library.dto;

import com.quaver.common.model.music.TrackView;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlaybackStartRequest {

    private List<TrackView> tracks;

    private Integer startIndex;

    private String playbackSource;
}
