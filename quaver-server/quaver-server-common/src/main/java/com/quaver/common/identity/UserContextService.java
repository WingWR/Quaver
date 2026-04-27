package com.quaver.common.identity;

import com.quaver.common.config.QuaverAppProperties;
import com.quaver.common.identity.entity.UserEntity;
import com.quaver.common.identity.mapper.UserMapper;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class UserContextService {

    public static final String USER_ID_HEADER = "x-quaver-user-id";
    public static final String USER_NAME_HEADER = "x-quaver-user-name";
    public static final String USER_EMAIL_HEADER = "x-quaver-user-email";

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

    @Transactional
    public UserEntity getCurrentUser() {
        ServletRequestAttributes attributes = currentRequestAttributes();
        if (attributes == null) {
            return ensureDefaultUser();
        }

        Object request = attributes.resolveReference(RequestAttributes.REFERENCE_REQUEST);
        String userId = normalize(readHeader(request, USER_ID_HEADER));
        if (isBlank(userId)) {
            return ensureDefaultUser();
        }

        String displayName = normalize(readHeader(request, USER_NAME_HEADER));
        String email = normalize(readHeader(request, USER_EMAIL_HEADER));

        String username = userId;
        if (isBlank(email)) {
            email = userId + "@quaver.local";
        }

        UserEntity existing = userMapper.selectById(userId);
        if (existing == null) {
            UserEntity user = new UserEntity();
            user.setId(userId);
            user.setUsername(username);
            user.setEmail(email);
            user.setPreferences(isBlank(displayName) ? Map.of() : Map.of("displayName", displayName));
            userMapper.insert(user);
            return user;
        }

        boolean changed = false;
        if (!username.equals(existing.getUsername())) {
            existing.setUsername(username);
            changed = true;
        }
        if (!isBlank(email) && !email.equals(existing.getEmail())) {
            existing.setEmail(email);
            changed = true;
        }
        if (!isBlank(displayName)) {
            existing.setPreferences(Map.of("displayName", displayName));
            changed = true;
        }
        if (changed) {
            userMapper.updateById(existing);
        }
        return existing;
    }

    public String getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private ServletRequestAttributes currentRequestAttributes() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? attributes
                : null;
    }

    private String readHeader(Object request, String headerName) {
        if (request == null) {
            return null;
        }

        try {
            Object value = request.getClass().getMethod("getHeader", String.class).invoke(request, headerName);
            return value instanceof String stringValue ? stringValue : null;
        } catch (ReflectiveOperationException ignored) {
            return null;
        }
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
