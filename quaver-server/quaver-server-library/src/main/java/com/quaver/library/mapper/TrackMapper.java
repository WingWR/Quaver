package com.quaver.library.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quaver.library.entity.TrackEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TrackMapper extends BaseMapper<TrackEntity> {
}
