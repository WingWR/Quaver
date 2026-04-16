package com.quaver.common.identity.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "qv_user", autoResultMap = true)
public class UserEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String username;

    private String email;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> preferences;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
