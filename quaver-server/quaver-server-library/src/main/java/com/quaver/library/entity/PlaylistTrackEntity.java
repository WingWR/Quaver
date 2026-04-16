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
@TableName("qv_playlist_track")
public class PlaylistTrackEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String playlistId;

    private String trackId;

    private Integer position;

    private LocalDateTime addedAt;
}
