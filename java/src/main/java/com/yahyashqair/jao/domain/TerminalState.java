package com.yahyashqair.jao.domain;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public record TerminalState(
        TerminalIdentifier identifier,
        TerminalStatus status,
        List<String> handles,
        List<TerminalLogEntry> logs,
        Map<String, TaskProgress> tasks,
        Instant updatedAt) {

    public TerminalState {
        Objects.requireNonNull(identifier, "identifier");
        status = status == null ? TerminalStatus.IDLE : status;
        handles = handles == null ? List.of() : List.copyOf(handles);
        logs = logs == null ? List.of() : List.copyOf(logs);
        tasks = tasks == null ? Map.of() : Map.copyOf(tasks);
        updatedAt = updatedAt == null ? Instant.now() : updatedAt;
    }

    public TerminalState withStatus(TerminalStatus newStatus) {
        return new TerminalState(identifier, newStatus, handles, logs, tasks, Instant.now());
    }

    public TerminalState withHandles(List<String> newHandles) {
        return new TerminalState(identifier, status, List.copyOf(newHandles), logs, tasks, Instant.now());
    }

    public TerminalState withLog(TerminalLogEntry entry) {
        List<TerminalLogEntry> updatedLogs = new java.util.ArrayList<>(logs);
        updatedLogs.add(entry);
        return new TerminalState(identifier, status, handles, Collections.unmodifiableList(updatedLogs), tasks, Instant.now());
    }

    public TerminalState withTaskProgress(TaskProgress progress) {
        Map<String, TaskProgress> updatedTasks = new java.util.HashMap<>(tasks);
        updatedTasks.put(progress.taskId(), progress);
        return new TerminalState(identifier, status, handles, logs, Collections.unmodifiableMap(updatedTasks), Instant.now());
    }
}
