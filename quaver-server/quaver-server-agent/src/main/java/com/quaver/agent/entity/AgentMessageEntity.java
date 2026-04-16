package com.quaver.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.quaver.agent.dto.AgentOperationDto;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName(value = "qv_agent_message", autoResultMap = true)
public class AgentMessageEntity {

    @TableId(type = IdType.INPUT)
    private String id;

    private String conversationId;

    private String userId;

    private String role;

    private String content;

    private String status;

    private String model;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<AgentOperationDto> operations;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> metadata;

    private LocalDateTime createdAt;
}
