package com.quaver.library.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("qv_playlist")
public class PlaylistEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String userId;

    private String name;

    private String description;

    private String cover;

    private String accent;

    private String source;

    private String spotifyId;

    private String spotifyUri;

    private String ownerName;

    private Integer version;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
