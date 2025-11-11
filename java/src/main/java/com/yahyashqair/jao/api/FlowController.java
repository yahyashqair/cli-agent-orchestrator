package com.yahyashqair.jao.api;

import com.yahyashqair.jao.domain.FlowDefinition;
import com.yahyashqair.jao.domain.FlowRecord;
import com.yahyashqair.jao.service.FlowService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/flows")
public class FlowController {

    private final FlowService flowService;

    public FlowController(FlowService flowService) {
        this.flowService = flowService;
    }

    @PostMapping
    public Mono<ResponseEntity<FlowRecord>> create(@Valid @RequestBody FlowDefinition definition) {
        return flowService.createFlow(definition)
                .map(record -> ResponseEntity.status(HttpStatus.CREATED).body(record));
    }

    @GetMapping
    public Flux<FlowRecord> list() {
        return flowService.listFlows();
    }
}
