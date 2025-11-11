package com.yahyashqair.jao.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalIdentifier;
import com.yahyashqair.jao.domain.TerminalLogEntry;
import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.service.TerminalPersistenceGateway;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import org.springframework.stereotype.Component;

@Component
public class TerminalPersistenceAdapter implements TerminalPersistenceGateway {

    private final TerminalRepository terminalRepository;
    private final TerminalLogRepository logRepository;
    private final ObjectMapper objectMapper;

    public TerminalPersistenceAdapter(
            TerminalRepository terminalRepository,
            TerminalLogRepository logRepository,
            ObjectMapper objectMapper) {
        this.terminalRepository = terminalRepository;
        this.logRepository = logRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public CompletionStage<Void> persistState(TerminalState state) {
        TerminalEntity entity = new TerminalEntity(
                state.identifier().id(),
                state.identifier().alias(),
                state.identifier().role(),
                state.status().name(),
                writeJson(state.handles()),
                writeJson(state.tasks()),
                state.updatedAt());
        return terminalRepository.save(entity).then().toFuture();
    }

    @Override
    public CompletionStage<Void> appendLog(TerminalIdentifier identifier, TerminalLogEntry entry) {
        TerminalLogEntity entity =
                new TerminalLogEntity(null, identifier.id(), entry.level(), entry.message(), entry.timestamp());
        return logRepository.save(entity).then().toFuture();
    }

    @Override
    public CompletionStage<List<TerminalState>> listStates() {
        return terminalRepository.findAll().map(this::toState).collectList().toFuture();
    }

    private TerminalState toState(TerminalEntity entity) {
        TerminalIdentifier identifier = new TerminalIdentifier(entity.getId(), entity.getAlias(), entity.getRole());
        List<String> handles = readHandles(entity.getHandles());
        Map<String, TaskProgress> tasks = readTasks(entity.getTasks());
        return new TerminalState(
                identifier,
                TerminalStatus.valueOf(entity.getStatus()),
                handles,
                List.of(),
                tasks,
                entity.getUpdatedAt());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialise value", e);
        }
    }

    private List<String> readHandles(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    json, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, TaskProgress> readTasks(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            Map<String, Map<String, Object>> raw = objectMapper.readValue(json, Map.class);
            Map<String, TaskProgress> tasks = new HashMap<>();
            raw.forEach((key, value) -> {
                String message = (String) value.getOrDefault("message", "");
                int percent = ((Number) value.getOrDefault("percentComplete", 0)).intValue();
                Instant updatedAt = value.containsKey("updatedAt")
                        ? Instant.parse((String) value.get("updatedAt"))
                        : Instant.now();
                tasks.put(key, new TaskProgress(key, percent, message, updatedAt));
            });
            return tasks;
        } catch (Exception e) {
            return Map.of();
        }
    }
}
