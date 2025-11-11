package com.yahyashqair.jao.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yahyashqair.jao.domain.FlowDefinition;
import com.yahyashqair.jao.persistence.FlowEntity;
import com.yahyashqair.jao.persistence.FlowRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class FlowService {

    private final FlowRepository flowRepository;
    private final OrchestrationService orchestrationService;
    private final ObjectMapper objectMapper;

    public FlowService(FlowRepository flowRepository, OrchestrationService orchestrationService, ObjectMapper objectMapper) {
        this.flowRepository = flowRepository;
        this.orchestrationService = orchestrationService;
        this.objectMapper = objectMapper;
    }

    public Mono<FlowEntity> addFlow(String name, String description, List<String> tasks) {
        FlowDefinition definition = new FlowDefinition(List.copyOf(tasks));
        String serialized = serialize(definition);
        FlowEntity entity = new FlowEntity(UUID.randomUUID(), name, description, serialized, Instant.now());
        return flowRepository.save(entity);
    }

    public Flux<FlowEntity> listFlows() {
        return flowRepository.findAll();
    }

    public Mono<Void> runFlow(UUID flowId, String targetAlias) {
        return flowRepository
                .findById(flowId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Unknown flow " + flowId)))
                .flatMap(flow -> Mono.defer(() -> {
                    FlowDefinition definition = deserialize(flow.getDefinition());
                    return Flux.fromIterable(definition.tasks())
                            .concatMap(task -> orchestrationService.assignTask(targetAlias, taskId(flowId, task), task))
                            .then();
                }));
    }

    private String serialize(FlowDefinition definition) {
        try {
            return objectMapper.writeValueAsString(definition);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize flow definition", e);
        }
    }

    private FlowDefinition deserialize(String value) {
        try {
            return objectMapper.readValue(value, FlowDefinition.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to deserialize flow definition", e);
        }
    }

    private String taskId(UUID flowId, String taskName) {
        return flowId + ":" + taskName.replaceAll("\\s+", "-").toLowerCase();
    }
}
