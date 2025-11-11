package com.yahyashqair.jao.api;

import com.yahyashqair.jao.persistence.FlowEntity;
import com.yahyashqair.jao.service.FlowService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
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
@RequestMapping(path = "/api/flows", produces = MediaType.APPLICATION_JSON_VALUE)
@Validated
public class FlowController {

    private final FlowService flowService;

    public FlowController(FlowService flowService) {
        this.flowService = flowService;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<FlowEntity> create(@Valid @RequestBody Mono<CreateFlowRequest> request) {
        return request.flatMap(body -> flowService.addFlow(body.name(), body.description(), body.tasks()));
    }

    @GetMapping
    public Flux<FlowEntity> list() {
        return flowService.listFlows();
    }

    @PostMapping(path = "/{flowId}/run", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Void> run(@PathVariable UUID flowId, @Valid @RequestBody Mono<RunFlowRequest> request) {
        return request.flatMap(body -> flowService.runFlow(flowId, body.targetAlias()));
    }

    public record CreateFlowRequest(
            @NotBlank String name, String description, @NotEmpty List<@NotBlank String> tasks) {}

    public record RunFlowRequest(@NotBlank String targetAlias) {}
}
