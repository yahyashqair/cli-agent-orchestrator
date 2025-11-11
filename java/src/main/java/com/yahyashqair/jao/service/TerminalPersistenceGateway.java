package com.yahyashqair.jao.service;

import com.yahyashqair.jao.domain.TerminalIdentifier;
import com.yahyashqair.jao.domain.TerminalLogEntry;
import com.yahyashqair.jao.domain.TerminalState;
import java.util.List;
import java.util.concurrent.CompletionStage;

public interface TerminalPersistenceGateway {
    CompletionStage<Void> persistState(TerminalState state);

    CompletionStage<Void> appendLog(TerminalIdentifier identifier, TerminalLogEntry entry);

    CompletionStage<List<TerminalState>> listStates();
}
