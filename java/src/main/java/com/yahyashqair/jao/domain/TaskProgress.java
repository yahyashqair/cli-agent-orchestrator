package com.yahyashqair.jao.domain;

import java.time.Instant;
import java.util.Objects;

public record TaskProgress(String taskId, int percentComplete, String message, Instant updatedAt) {
    public TaskProgress {
        Objects.requireNonNull(taskId, "taskId");
        Objects.requireNonNull(message, "message");
        if (percentComplete < 0 || percentComplete > 100) {
            throw new IllegalArgumentException("percentComplete must be between 0 and 100");
        }
        updatedAt = updatedAt == null ? Instant.now() : updatedAt;
    }
}
