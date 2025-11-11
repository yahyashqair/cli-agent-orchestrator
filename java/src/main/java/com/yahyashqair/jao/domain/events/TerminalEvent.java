package com.yahyashqair.jao.domain.events;

import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalLogEntry;
import java.util.UUID;

public sealed interface TerminalEvent permits TerminalRegistered, TerminalStateChanged, TerminalLogAppended {
}

public record TerminalRegistered(TerminalState state) implements TerminalEvent {
}

public record TerminalStateChanged(TerminalState state) implements TerminalEvent {
}

public record TerminalLogAppended(UUID terminalId, TerminalLogEntry entry) implements TerminalEvent {
}
