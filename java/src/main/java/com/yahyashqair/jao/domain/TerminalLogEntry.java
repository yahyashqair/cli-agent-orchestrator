package com.yahyashqair.jao.domain;

import java.time.Instant;

public record TerminalLogEntry(Instant timestamp, String level, String message) {
}
