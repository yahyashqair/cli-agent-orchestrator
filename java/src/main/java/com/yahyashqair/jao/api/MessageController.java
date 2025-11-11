package com.yahyashqair.jao.api;

import com.yahyashqair.jao.actor.SessionOrchestrator;
import com.yahyashqair.jao.domain.AssignTaskRequest;
import com.yahyashqair.jao.domain.MessageRoute;
import com.yahyashqair.jao.domain.SendMessageRequest;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalIdentifier;
import com.yahyashqair.jao.domain.UpdateProgressRequest;
import com.yahyashqair.jao.domain.UpdateStatusRequest;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.service.TerminalService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/messages")
@Validated
public class MessageController {

    private static final TerminalIdentifier SYSTEM_SENDER =
            new TerminalIdentifier(UUID.fromString("00000000-0000-0000-0000-000000000000"), "orchestrator", "system");

    private final TerminalService terminalService;

    public MessageController(TerminalService terminalService) {
        this.terminalService = terminalService;
    }

    @PostMapping("/send")
    public Mono<SessionOrchestrator.OperationAck> send(@Valid @RequestBody SendMessageRequest request) {
        return terminalService.sendMessage(toRoute(request.routeType(), request.routeValue()), SYSTEM_SENDER, request.payload());
    }

    @PostMapping("/assign")
    public Mono<SessionOrchestrator.OperationAck> assign(@Valid @RequestBody AssignTaskRequest request) {
        return terminalService.assignTask(
                toRoute(request.routeType(), request.routeValue()), request.taskId(), request.description());
    }

    @PostMapping("/progress")
    public Mono<SessionOrchestrator.OperationAck> progress(@Valid @RequestBody UpdateProgressRequest request) {
        TaskProgress progress = new TaskProgress(request.taskId(), request.percent(), request.message(), Instant.now());
        return terminalService.updateProgress(toRoute(request.routeType(), request.routeValue()), progress);
    }

    @PostMapping("/status")
    public Mono<SessionOrchestrator.OperationAck> status(@Valid @RequestBody UpdateStatusRequest request) {
        return terminalService.updateStatus(
                toRoute(request.routeType(), request.routeValue()), TerminalStatus.valueOf(request.status().toUpperCase()));
    }

    private MessageRoute toRoute(String type, String value) {
        return new MessageRoute(MessageRoute.RouteType.fromString(type), value);
    }
}
