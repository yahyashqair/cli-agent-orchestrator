package com.yahyashqair.jao.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("terminal_logs")
public class TerminalLogEntity {
    @Id private Long id;
    private UUID terminalId;
    private String level;
    private String message;
    private Instant createdAt;

    public TerminalLogEntity() {}

    public TerminalLogEntity(Long id, UUID terminalId, String level, String message, Instant createdAt) {
        this.id = id;
        this.terminalId = terminalId;
        this.level = level;
        this.message = message;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UUID getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(UUID terminalId) {
        this.terminalId = terminalId;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
