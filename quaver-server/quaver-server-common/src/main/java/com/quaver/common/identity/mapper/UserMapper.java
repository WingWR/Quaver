package com.quaver.common.identity.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.quaver.common.identity.entity.UserEntity;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<UserEntity> {
}
