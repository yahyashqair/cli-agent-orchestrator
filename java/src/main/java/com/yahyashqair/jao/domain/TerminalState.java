package com.yahyashqair.jao.domain;

import java.util.List;

public record TerminalState(TerminalHandle handle, TerminalStatus status, List<TerminalLogEntry> logs) {
}
