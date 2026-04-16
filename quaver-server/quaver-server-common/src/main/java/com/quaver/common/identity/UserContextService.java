package com.quaver.common.identity;

import com.quaver.common.config.QuaverAppProperties;
import com.quaver.common.identity.entity.UserEntity;
import com.quaver.common.identity.mapper.UserMapper;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserContextService {

    private final UserMapper userMapper;
    private final QuaverAppProperties appProperties;

    public UserContextService(UserMapper userMapper, QuaverAppProperties appProperties) {
        this.userMapper = userMapper;
        this.appProperties = appProperties;
    }

    @Transactional
    public UserEntity ensureDefaultUser() {
        UserEntity existing = userMapper.selectById(appProperties.getDefaultUserId());
        if (existing != null) {
            return existing;
        }

        UserEntity user = new UserEntity();
        user.setId(appProperties.getDefaultUserId());
        user.setUsername(appProperties.getDefaultUsername());
        user.setEmail(appProperties.getDefaultEmail());
        user.setPreferences(Map.of());
        userMapper.insert(user);
        return user;
    }

    public String getCurrentUserId() {
        return ensureDefaultUser().getId();
    }
}
