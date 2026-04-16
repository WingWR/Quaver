package com.quaver.library.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "qv_playback_session", autoResultMap = true)
public class PlaybackSessionEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String userId;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> queueTrackIds;

    private Integer currentTrackIndex;

    private Boolean isPlaying;

    private Integer progress;

    private Integer volume;

    private String playbackSource;

    private Boolean isShuffleEnabled;

    private String repeatMode;

    private String activePlaylistId;

    private String deviceId;

    private LocalDateTime lastUpdated;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
