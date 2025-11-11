package com.yahyashqair.jao.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table("flows")
public class FlowEntity {
    @Id
    private UUID id;

    private String name;

    private String description;

    private String definition;

    @Column("created_at")
    private Instant createdAt;

    public FlowEntity() {}

    public FlowEntity(UUID id, String name, String description, String definition, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.definition = definition;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDefinition() {
        return definition;
    }

    public void setDefinition(String definition) {
        this.definition = definition;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
