package com.yahyashqair.jao.api;

import com.yahyashqair.jao.domain.TerminalRegistrationRequest;
import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalSummary;
import com.yahyashqair.jao.service.TerminalService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/terminals")
@Validated
public class TerminalController {

    private final TerminalService terminalService;

    public TerminalController(TerminalService terminalService) {
        this.terminalService = terminalService;
    }

    @PostMapping
    public Mono<ResponseEntity<TerminalState>> register(@Valid @RequestBody TerminalRegistrationRequest request) {
        return terminalService.registerTerminal(request).map(state -> ResponseEntity.status(HttpStatus.CREATED).body(state));
    }

    @GetMapping
    public Mono<List<TerminalSummary>> list() {
        return terminalService
                .listTerminals()
                .map(sessionState ->
                        sessionState.terminals().stream().map(this::toSummary).collect(Collectors.toList()));
    }

    private TerminalSummary toSummary(TerminalState state) {
        return new TerminalSummary(
                state.identifier().id(),
                state.identifier().alias(),
                state.identifier().role(),
                state.handles(),
                state.status(),
                state.updatedAt());
    }
}
