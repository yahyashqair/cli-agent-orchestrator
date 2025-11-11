package com.yahyashqair.jao.api;

import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalHandle;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.persistence.TerminalEntity;
import com.yahyashqair.jao.service.OrchestrationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/terminals", produces = MediaType.APPLICATION_JSON_VALUE)
@Validated
public class TerminalController {

    private final OrchestrationService orchestrationService;

    public TerminalController(OrchestrationService orchestrationService) {
        this.orchestrationService = orchestrationService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<TerminalHandle> register(@Valid @RequestBody Mono<RegisterTerminalRequest> request) {
        return request.flatMap(body -> orchestrationService.registerTerminal(body.alias(), body.role()));
    }

    @GetMapping
    public Flux<TerminalEntity> list() {
        return orchestrationService.listTerminals();
    }

    @PostMapping(path = "/{target}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Void> sendMessage(
            @PathVariable String target, @Valid @RequestBody Mono<SendMessageRequest> request) {
        return request.flatMap(body -> orchestrationService.sendMessage(target, body.sender(), body.message()));
    }

    @PostMapping(path = "/{target}/assign", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Void> assign(
            @PathVariable String target, @Valid @RequestBody Mono<AssignTaskRequest> request) {
        return request.flatMap(body -> orchestrationService.assignTask(target, body.taskId(), body.description()));
    }

    @PostMapping(path = "/{target}/progress", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Void> progress(
            @PathVariable String target, @Valid @RequestBody Mono<UpdateProgressRequest> request) {
        return request.flatMap(body -> orchestrationService.updateProgress(
                target,
                new TaskProgress(body.taskId(), body.progress(), body.status(), Instant.now())));
    }

    @PostMapping(path = "/{target}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Void> status(
            @PathVariable String target, @Valid @RequestBody Mono<StatusUpdateRequest> request) {
        return request.flatMap(body -> orchestrationService.updateStatus(target, body.status()));
    }

    public record RegisterTerminalRequest(@NotBlank String alias, @NotBlank String role) {}

    public record SendMessageRequest(@NotBlank String sender, @NotBlank String message) {}

    public record AssignTaskRequest(@NotBlank String taskId, @NotBlank String description) {}

    public record UpdateProgressRequest(@NotBlank String taskId, double progress, @NotBlank String status) {}

    public record StatusUpdateRequest(TerminalStatus status) {}
}
