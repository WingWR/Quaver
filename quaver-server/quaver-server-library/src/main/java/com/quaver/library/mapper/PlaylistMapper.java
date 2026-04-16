package com.quaver.library.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quaver.library.entity.PlaylistEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PlaylistMapper extends BaseMapper<PlaylistEntity> {
}
