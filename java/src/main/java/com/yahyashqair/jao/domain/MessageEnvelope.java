package com.yahyashqair.jao.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record MessageEnvelope(
        UUID messageId,
        TerminalIdentifier sender,
        String receiver,
        String payload,
        Instant timestamp) {

    public MessageEnvelope {
        messageId = messageId == null ? UUID.randomUUID() : messageId;
        Objects.requireNonNull(sender, "sender");
        Objects.requireNonNull(receiver, "receiver");
        Objects.requireNonNull(payload, "payload");
        timestamp = timestamp == null ? Instant.now() : timestamp;
    }
}
