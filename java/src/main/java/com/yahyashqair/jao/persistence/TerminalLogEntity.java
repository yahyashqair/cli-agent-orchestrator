package com.yahyashqair.jao.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table("terminal_logs")
public class TerminalLogEntity {
    @Id
    private UUID id;

    @Column("terminal_id")
    private UUID terminalId;

    private Instant timestamp;

    private String level;

    private String message;

    public TerminalLogEntity() {}

    public TerminalLogEntity(UUID id, UUID terminalId, Instant timestamp, String level, String message) {
        this.id = id;
        this.terminalId = terminalId;
        this.timestamp = timestamp;
        this.level = level;
        this.message = message;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(UUID terminalId) {
        this.terminalId = terminalId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
