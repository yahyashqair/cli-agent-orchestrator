package com.yahyashqair.jao.domain;

import java.util.Locale;
import java.util.Objects;

public record MessageRoute(RouteType type, String value) {

    public MessageRoute {
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(value, "value");
        value = value.trim();
        if (value.isEmpty()) {
            throw new IllegalArgumentException("value must not be empty");
        }
    }

    public enum RouteType {
        ID,
        ALIAS,
        HANDLE;

        public static RouteType fromString(String input) {
            Objects.requireNonNull(input, "input");
            return RouteType.valueOf(input.toUpperCase(Locale.ROOT));
        }
    }
}
