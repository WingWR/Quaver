package com.quaver.spotify.entity;

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
@TableName(value = "qv_spotify_authorization", autoResultMap = true)
public class SpotifyAuthorizationEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String developerAccount;

    private String accessToken;

    private String refreshToken;

    private String tokenType;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> scopes;

    private LocalDateTime expiresAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
