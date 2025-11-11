package com.yahyashqair.jao.actor;

import com.yahyashqair.jao.domain.MessageEnvelope;
import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalLogEntry;
import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.domain.events.TerminalLogAppended;
import com.yahyashqair.jao.domain.events.TerminalStateChanged;
import com.yahyashqair.jao.service.TerminalPersistenceGateway;
import com.yahyashqair.jao.service.TerminalPublisher;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.apache.pekko.actor.typed.Behavior;
import org.apache.pekko.actor.typed.javadsl.AbstractBehavior;
import org.apache.pekko.actor.typed.javadsl.ActorContext;
import org.apache.pekko.actor.typed.javadsl.Behaviors;
import org.apache.pekko.actor.typed.javadsl.Receive;

public final class TerminalActor extends AbstractBehavior<TerminalActor.Command> {

    public sealed interface Command permits ReceiveMessage, AssignTask, UpdateProgress, AttachHandle, DetachHandle, UpdateStatus {
    }

    public record ReceiveMessage(MessageEnvelope envelope) implements Command {
    }

    public record AssignTask(String taskId, String description) implements Command {
    }

    public record UpdateProgress(TaskProgress progress) implements Command {
    }

    public record AttachHandle(String handle) implements Command {
    }

    public record DetachHandle(String handle) implements Command {
    }

    public record UpdateStatus(TerminalStatus status) implements Command {
    }

    private TerminalState state;
    private final TerminalPersistenceGateway persistence;
    private final TerminalPublisher publisher;

    private TerminalActor(
            ActorContext<Command> context,
            TerminalState initialState,
            TerminalPersistenceGateway persistence,
            TerminalPublisher publisher) {
        super(context);
        this.state = initialState;
        this.persistence = persistence;
        this.publisher = publisher;
        this.publisher.publish(new com.yahyashqair.jao.domain.events.TerminalRegistered(initialState));
        this.persistence.persistState(initialState);
    }

    public static Behavior<Command> create(
            TerminalState initialState, TerminalPersistenceGateway persistence, TerminalPublisher publisher) {
        return Behaviors.setup(ctx -> new TerminalActor(ctx, initialState, persistence, publisher));
    }

    @Override
    public Receive<Command> createReceive() {
        return newReceiveBuilder()
                .onMessage(ReceiveMessage.class, this::onReceiveMessage)
                .onMessage(AssignTask.class, this::onAssignTask)
                .onMessage(UpdateProgress.class, this::onUpdateProgress)
                .onMessage(AttachHandle.class, this::onAttachHandle)
                .onMessage(DetachHandle.class, this::onDetachHandle)
                .onMessage(UpdateStatus.class, this::onUpdateStatus)
                .build();
    }

    private Behavior<Command> onReceiveMessage(ReceiveMessage message) {
        TerminalLogEntry entry = new TerminalLogEntry(Instant.now(), "INFO", message.envelope().payload());
        TerminalState updated = state.withLog(entry).withStatus(TerminalStatus.PROCESSING);
        state = updated;
        publisher.publish(new TerminalStateChanged(updated));
        publisher.publish(new TerminalLogAppended(state.identifier().id(), entry));
        persistence.persistState(updated);
        persistence.appendLog(state.identifier(), entry);
        return this;
    }

    private Behavior<Command> onAssignTask(AssignTask assignTask) {
        TerminalLogEntry entry =
                new TerminalLogEntry(Instant.now(), "ASSIGN", "Task " + assignTask.taskId() + ": " + assignTask.description());
        TerminalState updated = state.withLog(entry).withStatus(TerminalStatus.PROCESSING);
        state = updated;
        publisher.publish(new TerminalStateChanged(updated));
        publisher.publish(new TerminalLogAppended(state.identifier().id(), entry));
        persistence.persistState(updated);
        persistence.appendLog(state.identifier(), entry);
        return this;
    }

    private Behavior<Command> onUpdateProgress(UpdateProgress command) {
        TerminalState updated = state.withTaskProgress(command.progress());
        state = updated;
        publisher.publish(new TerminalStateChanged(updated));
        persistence.persistState(updated);
        return this;
    }

    private Behavior<Command> onAttachHandle(AttachHandle command) {
        Set<String> handles = new HashSet<>(state.handles());
        handles.add(command.handle());
        TerminalState updated = state.withHandles(new ArrayList<>(handles));
        state = updated;
        publisher.publish(new TerminalStateChanged(updated));
        persistence.persistState(updated);
        return this;
    }

    private Behavior<Command> onDetachHandle(DetachHandle command) {
        List<String> handles = new ArrayList<>(state.handles());
        handles.remove(command.handle());
        TerminalState updated = state.withHandles(handles);
        state = updated;
        publisher.publish(new TerminalStateChanged(updated));
        persistence.persistState(updated);
        return this;
    }

    private Behavior<Command> onUpdateStatus(UpdateStatus command) {
        TerminalState updated = state.withStatus(command.status());
        state = updated;
        publisher.publish(new TerminalStateChanged(updated));
        persistence.persistState(updated);
        return this;
    }
}
