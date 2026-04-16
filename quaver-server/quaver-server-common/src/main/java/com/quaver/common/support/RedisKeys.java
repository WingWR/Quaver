package com.quaver.common.support;

public final class RedisKeys {

    private RedisKeys() {
    }

    public static String queue(String userId) {
        return "quaver:queue:" + userId;
    }

    public static String session(String userId) {
        return "quaver:session:" + userId;
    }

    public static String agentMessages(String conversationId) {
        return "quaver:agent:conversation:" + conversationId;
    }
}
