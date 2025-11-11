package com.yahyashqair.jao.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("terminals")
public class TerminalEntity {
    @Id private UUID id;
    private String alias;
    private String role;
    private String status;
    private String handles;
    private String tasks;
    private Instant updatedAt;

    public TerminalEntity() {}

    public TerminalEntity(
            UUID id, String alias, String role, String status, String handles, String tasks, Instant updatedAt) {
        this.id = id;
        this.alias = alias;
        this.role = role;
        this.status = status;
        this.handles = handles;
        this.tasks = tasks;
        this.updatedAt = updatedAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getHandles() {
        return handles;
    }

    public void setHandles(String handles) {
        this.handles = handles;
    }

    public String getTasks() {
        return tasks;
    }

    public void setTasks(String tasks) {
        this.tasks = tasks;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
