package com.yahyashqair.jao.domain;

import java.time.Instant;
import java.util.Objects;

public record TerminalLogEntry(Instant timestamp, String level, String message) {
    public TerminalLogEntry {
        timestamp = timestamp == null ? Instant.now() : timestamp;
        Objects.requireNonNull(level, "level");
        Objects.requireNonNull(message, "message");
    }
}
