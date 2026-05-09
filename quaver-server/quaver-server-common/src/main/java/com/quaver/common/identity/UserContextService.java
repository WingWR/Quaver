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

    private final ThreadLocal<UserContextSnapshot> userContextOverride = new ThreadLocal<>();
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
        UserContextSnapshot override = userContextOverride.get();
        if (override != null) {
            return resolveUser(override.userId(), override.displayName(), override.email());
        }

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

        return resolveUser(userId, displayName, email);
    }

    public String getCurrentUserId() {
        return getCurrentUser().getId();
    }

    @Transactional
    public UserContextSnapshot captureCurrentUserContext() {
        UserEntity user = getCurrentUser();
        Object displayName = user.getPreferences() == null ? null : user.getPreferences().get("displayName");
        return new UserContextSnapshot(
                user.getId(),
                displayName instanceof String stringValue ? stringValue : user.getUsername(),
                user.getEmail()
        );
    }

    public void runWithUserContext(UserContextSnapshot snapshot, Runnable action) {
        UserContextSnapshot previous = userContextOverride.get();
        if (snapshot != null) {
            userContextOverride.set(snapshot);
        } else {
            userContextOverride.remove();
        }
        try {
            action.run();
        } finally {
            if (previous == null) {
                userContextOverride.remove();
            } else {
                userContextOverride.set(previous);
            }
        }
    }

    private UserEntity resolveUser(String userId, String displayName, String email) {
        String normalizedUserId = normalize(userId);
        if (isBlank(normalizedUserId)) {
            return ensureDefaultUser();
        }

        String username = normalizedUserId;
        String normalizedDisplayName = normalize(displayName);
        String normalizedEmail = normalize(email);
        if (isBlank(normalizedEmail)) {
            normalizedEmail = normalizedUserId + "@quaver.local";
        }

        UserEntity existing = userMapper.selectById(normalizedUserId);
        if (existing == null) {
            UserEntity user = new UserEntity();
            user.setId(normalizedUserId);
            user.setUsername(username);
            user.setEmail(normalizedEmail);
            user.setPreferences(isBlank(normalizedDisplayName) ? Map.of() : Map.of("displayName", normalizedDisplayName));
            userMapper.insert(user);
            return user;
        }

        boolean changed = false;
        if (!username.equals(existing.getUsername())) {
            existing.setUsername(username);
            changed = true;
        }
        if (!isBlank(normalizedEmail) && !normalizedEmail.equals(existing.getEmail())) {
            existing.setEmail(normalizedEmail);
            changed = true;
        }
        if (!isBlank(normalizedDisplayName)) {
            existing.setPreferences(Map.of("displayName", normalizedDisplayName));
            changed = true;
        }
        if (changed) {
            userMapper.updateById(existing);
        }
        return existing;
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

    public record UserContextSnapshot(String userId, String displayName, String email) {
    }
}
