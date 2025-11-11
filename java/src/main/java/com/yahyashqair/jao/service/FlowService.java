package com.yahyashqair.jao.service;

import com.yahyashqair.jao.domain.FlowDefinition;
import com.yahyashqair.jao.domain.FlowRecord;
import com.yahyashqair.jao.persistence.FlowEntity;
import com.yahyashqair.jao.persistence.FlowRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class FlowService {

    private final FlowRepository flowRepository;

    public FlowService(FlowRepository flowRepository) {
        this.flowRepository = flowRepository;
    }

    public Mono<FlowRecord> createFlow(FlowDefinition definition) {
        FlowEntity entity = new FlowEntity(null, definition.name(), definition.specification(), Instant.now());
        return flowRepository.save(entity).map(this::toRecord);
    }

    public Flux<FlowRecord> listFlows() {
        return flowRepository.findAll().map(this::toRecord);
    }

    private FlowRecord toRecord(FlowEntity entity) {
        return new FlowRecord(entity.getId(), entity.getName(), entity.getSpecification(), entity.getCreatedAt());
    }
}
