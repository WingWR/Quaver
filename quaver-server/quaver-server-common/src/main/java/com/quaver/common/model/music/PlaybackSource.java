package com.quaver.common.model.music;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PlaybackSource {
    BACKEND("backend"),
    SPOTIFY("spotify");

    private final String value;

    PlaybackSource(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static PlaybackSource fromValue(String value) {
        if (value == null) {
            return BACKEND;
        }
        for (PlaybackSource source : values()) {
            if (source.value.equalsIgnoreCase(value)) {
                return source;
            }
        }
        return BACKEND;
    }
}
