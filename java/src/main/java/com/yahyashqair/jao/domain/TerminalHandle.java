package com.yahyashqair.jao.domain;

import java.util.UUID;

public record TerminalHandle(UUID id, String alias, String role) {
    public String handleForTask(String taskId) {
        return "owner(" + taskId + ")";
    }
}
