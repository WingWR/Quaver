package com.quaver.library.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.quaver.common.model.music.LyricLineView;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "qv_track", autoResultMap = true)
public class TrackEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String title;

    private String artist;

    private String album;

    private Integer duration;

    private String artwork;

    private String accent;

    private String mood;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> genres;

    private String source;

    private String spotifyId;

    private String spotifyUri;

    private String spotifyUrl;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<LyricLineView> lyrics;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
