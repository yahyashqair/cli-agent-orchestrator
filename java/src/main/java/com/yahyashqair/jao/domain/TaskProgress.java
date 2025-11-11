package com.yahyashqair.jao.domain;

import java.time.Instant;

public record TaskProgress(String taskId, double progress, String status, Instant updatedAt) {
}
