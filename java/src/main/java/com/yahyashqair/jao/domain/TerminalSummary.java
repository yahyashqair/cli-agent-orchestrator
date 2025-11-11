package com.yahyashqair.jao.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TerminalSummary(
        UUID id,
        String alias,
        String role,
        List<String> handles,
        TerminalStatus status,
        Instant updatedAt) {
}
