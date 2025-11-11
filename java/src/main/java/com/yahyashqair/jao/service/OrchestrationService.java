package com.yahyashqair.jao.service;

import com.yahyashqair.jao.actor.SessionOrchestrator;
import com.yahyashqair.jao.actor.TerminalActor;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalHandle;
import com.yahyashqair.jao.domain.TerminalRegistration;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.events.TerminalEvent;
import com.yahyashqair.jao.events.TerminalEventPublisher;
import com.yahyashqair.jao.persistence.TerminalEntity;
import com.yahyashqair.jao.persistence.TerminalRepository;
import java.time.Duration;
import java.util.UUID;
import org.apache.pekko.actor.typed.ActorSystem;
import org.apache.pekko.actor.typed.Scheduler;
import org.apache.pekko.actor.typed.javadsl.AskPattern;
import org.apache.pekko.util.Timeout;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class OrchestrationService {

    private final ActorSystem<SessionOrchestrator.Command> actorSystem;
    private final TerminalRepository terminalRepository;
    private final TerminalEventPublisher eventPublisher;
    private final Scheduler scheduler;
    private final Timeout timeout = Timeout.create(Duration.ofSeconds(3));

    public OrchestrationService(
            ActorSystem<SessionOrchestrator.Command> actorSystem,
            TerminalRepository terminalRepository,
            TerminalEventPublisher eventPublisher) {
        this.actorSystem = actorSystem;
        this.terminalRepository = terminalRepository;
        this.eventPublisher = eventPublisher;
        this.scheduler = actorSystem.scheduler();
    }

    public Mono<TerminalHandle> registerTerminal(String alias, String role) {
        UUID id = UUID.randomUUID();
        TerminalRegistration registration = new TerminalRegistration(id, alias, role);
        return Mono.fromCompletionStage(() -> AskPattern.ask(
                        actorSystem,
                        replyTo -> new SessionOrchestrator.RegisterTerminal(registration, replyTo),
                        timeout,
                        scheduler))
                .map(SessionOrchestrator.RegistrationAck::handle);
    }

    public Mono<Void> sendMessage(String target, String sender, String message) {
        TerminalActor.Command payload = new TerminalActor.ReceiveMessage(sender, message);
        return route(target, payload);
    }

    public Mono<Void> assignTask(String target, String taskId, String description) {
        TerminalActor.AssignTask payload = new TerminalActor.AssignTask(taskId, description);
        return resolveTerminalId(target)
                .flatMap(id -> route(id, payload)
                        .then(Mono.fromRunnable(() ->
                                actorSystem.tell(new SessionOrchestrator.RegisterHandle(id, "owner(" + taskId + ")")))))
                .then();
    }

    public Mono<Void> handoff(String fromAlias, String toTarget, String message) {
        return sendMessage(toTarget, fromAlias, "HANDOFF:" + message);
    }

    public Mono<Void> updateProgress(String target, TaskProgress progress) {
        TerminalActor.UpdateProgress payload = new TerminalActor.UpdateProgress(progress);
        return route(target, payload);
    }

    public Mono<Void> updateStatus(String target, TerminalStatus status) {
        return route(target, new TerminalActor.UpdateStatus(status));
    }

    public Flux<TerminalEvent> events() {
        return eventPublisher.stream();
    }

    public Flux<TerminalEntity> listTerminals() {
        return terminalRepository.findAll();
    }

    private Mono<Void> route(String target, TerminalActor.Command payload) {
        if (looksLikeUuid(target)) {
            return route(UUID.fromString(target), payload);
        }
        if (target.startsWith("owner(")) {
            actorSystem.tell(new SessionOrchestrator.RouteByHandle(target, payload));
            return Mono.empty();
        }
        actorSystem.tell(new SessionOrchestrator.RouteByAlias(target, payload));
        return Mono.empty();
    }

    private Mono<Void> route(UUID id, TerminalActor.Command payload) {
        actorSystem.tell(new SessionOrchestrator.RouteById(id, payload));
        return Mono.empty();
    }

    private Mono<UUID> resolveTerminalId(String target) {
        if (looksLikeUuid(target)) {
            return Mono.just(UUID.fromString(target));
        }
        return terminalRepository
                .findByAlias(target)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Unknown terminal target " + target)))
                .map(TerminalEntity::getId);
    }

    private boolean looksLikeUuid(String value) {
        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
