package com.yahyashqair.jao.persistence;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Table("flows")
public class FlowEntity {
    @Id private Long id;
    private String name;
    private String specification;
    private Instant createdAt;

    public FlowEntity() {}

    public FlowEntity(Long id, String name, String specification, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.specification = specification;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSpecification() {
        return specification;
    }

    public void setSpecification(String specification) {
        this.specification = specification;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
