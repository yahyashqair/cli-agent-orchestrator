package com.yahyashqair.jao.service;

import com.yahyashqair.jao.actor.SessionOrchestrator;
import com.yahyashqair.jao.domain.MessageEnvelope;
import com.yahyashqair.jao.domain.MessageRoute;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalIdentifier;
import com.yahyashqair.jao.domain.TerminalRegistrationRequest;
import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalStatus;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.apache.pekko.actor.typed.ActorSystem;
import org.apache.pekko.actor.typed.javadsl.AskPattern;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class TerminalService {

    private final ActorSystem<SessionOrchestrator.Command> actorSystem;
    private final Duration timeout = Duration.ofSeconds(5);

    public TerminalService(ActorSystem<SessionOrchestrator.Command> actorSystem) {
        this.actorSystem = actorSystem;
    }

    public Mono<TerminalState> registerTerminal(TerminalRegistrationRequest request) {
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.RegisterTerminal(request, replyTo),
                        timeout,
                        actorSystem.scheduler()))
                .flatMap(result -> {
                    if (result instanceof SessionOrchestrator.RegistrationAccepted accepted) {
                        return Mono.just(accepted.state());
                    }
                    return Mono.error(new IllegalStateException(((SessionOrchestrator.RegistrationRejected) result).reason()));
                });
    }

    public Mono<SessionOrchestrator.OperationAck> sendMessage(
            MessageRoute route, TerminalIdentifier sender, String payload) {
        MessageEnvelope envelope = new MessageEnvelope(UUID.randomUUID(), sender, route.value(), payload, Instant.now());
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.SendToTerminal(route, envelope, replyTo),
                        timeout,
                        actorSystem.scheduler()));
    }

    public Mono<SessionOrchestrator.OperationAck> assignTask(
            MessageRoute route, String taskId, String description) {
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.AssignTask(route, taskId, description, replyTo),
                        timeout,
                        actorSystem.scheduler()));
    }

    public Mono<SessionOrchestrator.OperationAck> updateProgress(MessageRoute route, TaskProgress progress) {
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.UpdateTaskProgress(route, progress, replyTo),
                        timeout,
                        actorSystem.scheduler()));
    }

    public Mono<SessionOrchestrator.OperationAck> updateStatus(MessageRoute route, TerminalStatus status) {
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.UpdateTerminalStatus(route, status, replyTo),
                        timeout,
                        actorSystem.scheduler()));
    }

    public Mono<SessionOrchestrator.SessionState> listTerminals() {
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.GetState(replyTo),
                        timeout,
                        actorSystem.scheduler()));
    }
}
