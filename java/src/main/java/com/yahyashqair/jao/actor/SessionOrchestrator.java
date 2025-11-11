package com.yahyashqair.jao.actor;

import com.yahyashqair.jao.domain.MessageEnvelope;
import com.yahyashqair.jao.domain.MessageRoute;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalIdentifier;
import com.yahyashqair.jao.domain.TerminalRegistrationRequest;
import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.service.TerminalPersistenceGateway;
import com.yahyashqair.jao.service.TerminalPublisher;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletionStage;
import org.apache.pekko.actor.typed.ActorRef;
import org.apache.pekko.actor.typed.Behavior;
import org.apache.pekko.actor.typed.Terminated;
import org.apache.pekko.actor.typed.javadsl.AbstractBehavior;
import org.apache.pekko.actor.typed.javadsl.ActorContext;
import org.apache.pekko.actor.typed.javadsl.Behaviors;
import org.apache.pekko.actor.typed.javadsl.Receive;

public final class SessionOrchestrator extends AbstractBehavior<SessionOrchestrator.Command> {

    public sealed interface Command
            permits RegisterTerminal, SendToTerminal, AssignTask, UpdateTaskProgress, UpdateTerminalStatus, DetachTerminal, GetState {
    }

    public record RegisterTerminal(TerminalRegistrationRequest request, ActorRef<RegistrationResult> replyTo)
            implements Command {}

    public record SendToTerminal(
                    MessageRoute route, MessageEnvelope envelope, ActorRef<OperationAck> replyTo)
            implements Command {}

    public record AssignTask(
                    MessageRoute route, String taskId, String description, ActorRef<OperationAck> replyTo)
            implements Command {}

    public record UpdateTaskProgress(
                    MessageRoute route, TaskProgress progress, ActorRef<OperationAck> replyTo)
            implements Command {}

    public record UpdateTerminalStatus(
                    MessageRoute route, TerminalStatus status, ActorRef<OperationAck> replyTo)
            implements Command {}

    public record DetachTerminal(UUID id, ActorRef<OperationAck> replyTo) implements Command {}

    public record GetState(ActorRef<SessionState> replyTo) implements Command {}

    public sealed interface RegistrationResult permits RegistrationAccepted, RegistrationRejected {
    }

    public record RegistrationAccepted(TerminalState state) implements RegistrationResult {
    }

    public record RegistrationRejected(String reason) implements RegistrationResult {
    }

    public record OperationAck(boolean success, String message) {
        public static OperationAck success(String message) {
            return new OperationAck(true, message);
        }

        public static OperationAck failure(String message) {
            return new OperationAck(false, message);
        }
    }

    public record SessionState(List<TerminalState> terminals) {
    }

    private final Map<UUID, ActorRef<TerminalActor.Command>> terminalsById = new HashMap<>();
    private final Map<String, UUID> aliasIndex = new HashMap<>();
    private final Map<String, UUID> handleIndex = new HashMap<>();
    private final TerminalPersistenceGateway persistenceGateway;
    private final TerminalPublisher publisher;

    private SessionOrchestrator(
            ActorContext<Command> context,
            TerminalPersistenceGateway persistenceGateway,
            TerminalPublisher publisher) {
        super(context);
        this.persistenceGateway = persistenceGateway;
        this.publisher = publisher;
    }

    public static Behavior<Command> create(
            TerminalPersistenceGateway persistenceGateway, TerminalPublisher publisher) {
        return Behaviors.setup(ctx -> new SessionOrchestrator(ctx, persistenceGateway, publisher));
    }

    @Override
    public Receive<Command> createReceive() {
        return newReceiveBuilder()
                .onMessage(RegisterTerminal.class, this::onRegisterTerminal)
                .onMessage(SendToTerminal.class, this::onSendToTerminal)
                .onMessage(AssignTask.class, this::onAssignTask)
                .onMessage(UpdateTaskProgress.class, this::onUpdateProgress)
                .onMessage(UpdateTerminalStatus.class, this::onUpdateStatus)
                .onMessage(DetachTerminal.class, this::onDetachTerminal)
                .onMessage(GetState.class, this::onGetState)
                .onSignal(Terminated.class, this::onTerminated)
                .build();
    }

    private Behavior<Command> onRegisterTerminal(RegisterTerminal command) {
        if (aliasIndex.containsKey(command.request().alias())) {
            command.replyTo().tell(new RegistrationRejected("Alias already registered"));
            return this;
        }
        UUID id = UUID.randomUUID();
        TerminalIdentifier identifier = new TerminalIdentifier(id, command.request().alias(), command.request().role());
        List<String> handles = new ArrayList<>();
        if (command.request().handles() != null) {
            handles.addAll(command.request().handles());
        }
        TerminalState state = new TerminalState(identifier, TerminalStatus.IDLE, handles, List.of(), Map.of(), Instant.now());
        ActorRef<TerminalActor.Command> ref =
                getContext()
                        .spawn(
                                TerminalActor.create(state, persistenceGateway, publisher::publish),
                                "terminal-" + id);
        getContext().watch(ref);
        terminalsById.put(id, ref);
        aliasIndex.put(identifier.alias(), id);
        handles.forEach(handle -> handleIndex.put(handle, id));
        persistenceGateway.persistState(state);
        command.replyTo().tell(new RegistrationAccepted(state));
        return this;
    }

    private Behavior<Command> onSendToTerminal(SendToTerminal command) {
        return route(command.route())
                .map(target -> {
                    target.tell(new TerminalActor.ReceiveMessage(command.envelope()));
                    command.replyTo().tell(OperationAck.success("Message delivered"));
                    return this;
                })
                .orElseGet(() -> {
                    command.replyTo().tell(OperationAck.failure("Target not found"));
                    return this;
                });
    }

    private Behavior<Command> onAssignTask(AssignTask command) {
        return route(command.route())
                .map(target -> {
                    target.tell(new TerminalActor.AssignTask(command.taskId(), command.description()));
                    command.replyTo().tell(OperationAck.success("Task assignment delivered"));
                    return this;
                })
                .orElseGet(() -> {
                    command.replyTo().tell(OperationAck.failure("Target not found"));
                    return this;
                });
    }

    private Behavior<Command> onUpdateProgress(UpdateTaskProgress command) {
        return route(command.route())
                .map(target -> {
                    target.tell(new TerminalActor.UpdateProgress(command.progress()));
                    command.replyTo().tell(OperationAck.success("Progress updated"));
                    return this;
                })
                .orElseGet(() -> {
                    command.replyTo().tell(OperationAck.failure("Target not found"));
                    return this;
                });
    }

    private Behavior<Command> onUpdateStatus(UpdateTerminalStatus command) {
        return route(command.route())
                .map(target -> {
                    target.tell(new TerminalActor.UpdateStatus(command.status()));
                    command.replyTo().tell(OperationAck.success("Status updated"));
                    return this;
                })
                .orElseGet(() -> {
                    command.replyTo().tell(OperationAck.failure("Target not found"));
                    return this;
                });
    }

    private Behavior<Command> onDetachTerminal(DetachTerminal command) {
        ActorRef<TerminalActor.Command> ref = terminalsById.remove(command.id());
        if (ref != null) {
            aliasIndex.values().removeIf(id -> id.equals(command.id()));
            handleIndex.values().removeIf(id -> id.equals(command.id()));
            getContext().stop(ref);
            command.replyTo().tell(OperationAck.success("Terminal stopped"));
        } else {
            command.replyTo().tell(OperationAck.failure("Terminal not found"));
        }
        return this;
    }

    private Behavior<Command> onGetState(GetState command) {
        CompletionStage<List<TerminalState>> states = persistenceGateway.listStates();
        states.whenComplete((result, error) -> {
            if (error != null) {
                command.replyTo().tell(new SessionState(List.of()));
            } else {
                command.replyTo().tell(new SessionState(result));
            }
        });
        return this;
    }

    private Behavior<Command> onTerminated(Terminated signal) {
        terminalsById.entrySet().removeIf(entry -> entry.getValue().equals(signal.getRef()));
        aliasIndex.entrySet().removeIf(entry -> !terminalsById.containsKey(entry.getValue()));
        handleIndex.entrySet().removeIf(entry -> !terminalsById.containsKey(entry.getValue()));
        return this;
    }

    private Optional<ActorRef<TerminalActor.Command>> route(MessageRoute route) {
        return switch (route.type()) {
            case ID -> Optional.ofNullable(terminalsById.get(UUID.fromString(route.value())));
            case ALIAS -> Optional.ofNullable(aliasIndex.get(route.value()))
                    .map(terminalsById::get);
            case HANDLE -> Optional.ofNullable(handleIndex.get(route.value()))
                    .map(terminalsById::get);
        };
    }
}
