package com.yahyashqair.jao.domain;

import java.util.Objects;
import java.util.UUID;

public record TerminalIdentifier(UUID id, String alias, String role) {
    public TerminalIdentifier {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(alias, "alias");
        Objects.requireNonNull(role, "role");
    }
}
