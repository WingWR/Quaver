package com.quaver.library.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quaver.library.entity.PlaybackSessionEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PlaybackSessionMapper extends BaseMapper<PlaybackSessionEntity> {
}
