package com.quaver.spotify.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quaver.spotify.entity.SpotifyAuthorizationEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SpotifyAuthorizationMapper extends BaseMapper<SpotifyAuthorizationEntity> {
}
