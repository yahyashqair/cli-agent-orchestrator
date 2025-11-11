package com.yahyashqair.jao.events;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalHandle;
import com.yahyashqair.jao.domain.TerminalLogEntry;
import com.yahyashqair.jao.domain.TerminalStatus;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(Include.NON_NULL)
public record TerminalEvent(
        UUID terminalId,
        TerminalHandle handle,
        TerminalEventType type,
        TerminalStatus status,
        TerminalLogEntry logEntry,
        TaskProgress progress,
        Instant emittedAt) {
}
