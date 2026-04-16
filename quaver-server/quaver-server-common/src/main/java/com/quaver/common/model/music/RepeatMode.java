package com.quaver.common.model.music;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RepeatMode {
    OFF("off"),
    CONTEXT("context"),
    TRACK("track");

    private final String value;

    RepeatMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static RepeatMode fromValue(String value) {
        if (value == null) {
            return OFF;
        }
        for (RepeatMode mode : values()) {
            if (mode.value.equalsIgnoreCase(value)) {
                return mode;
            }
        }
        return OFF;
    }
}
