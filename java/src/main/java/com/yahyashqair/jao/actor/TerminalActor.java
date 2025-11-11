package com.yahyashqair.jao.actor;

import com.yahyashqair.jao.domain.TaskProgress;
import com.yahyashqair.jao.domain.TerminalHandle;
import com.yahyashqair.jao.domain.TerminalLogEntry;
import com.yahyashqair.jao.domain.TerminalRegistration;
import com.yahyashqair.jao.domain.TerminalState;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.events.TerminalEvent;
import com.yahyashqair.jao.events.TerminalEventPublisher;
import com.yahyashqair.jao.events.TerminalEventType;
import com.yahyashqair.jao.persistence.TerminalEntity;
import com.yahyashqair.jao.persistence.TerminalLogEntity;
import com.yahyashqair.jao.persistence.TerminalLogRepository;
import com.yahyashqair.jao.persistence.TerminalRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.apache.pekko.actor.typed.Behavior;
import org.apache.pekko.actor.typed.javadsl.AbstractBehavior;
import org.apache.pekko.actor.typed.javadsl.ActorContext;
import org.apache.pekko.actor.typed.javadsl.Behaviors;

public class TerminalActor extends AbstractBehavior<TerminalActor.Command> {

    public interface Command {}

    public record Initialize(TerminalRegistration registration) implements Command {}

    public record ReceiveMessage(String sender, String message) implements Command {}

    public record AssignTask(String taskId, String description) implements Command {}

    public record UpdateProgress(TaskProgress progress) implements Command {}

    public record UpdateStatus(TerminalStatus status) implements Command {}

    public record Shutdown() implements Command {}

    private final TerminalRepository terminalRepository;
    private final TerminalLogRepository logRepository;
    private final TerminalEventPublisher eventPublisher;

    private TerminalRegistration registration;
    private TerminalStatus status = TerminalStatus.IDLE;
    private final List<TerminalLogEntry> logs = Collections.synchronizedList(new ArrayList<>());
    private Instant createdAt = Instant.now();

    public static Behavior<Command> create(
            TerminalRepository terminalRepository,
            TerminalLogRepository logRepository,
            TerminalEventPublisher eventPublisher) {
        return Behaviors.setup(context -> new TerminalActor(context, terminalRepository, logRepository, eventPublisher));
    }

    private TerminalActor(
            ActorContext<Command> context,
            TerminalRepository terminalRepository,
            TerminalLogRepository logRepository,
            TerminalEventPublisher eventPublisher) {
        super(context);
        this.terminalRepository = terminalRepository;
        this.logRepository = logRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public Behavior<Command> createReceive() {
        return newReceiveBuilder()
                .onMessage(Initialize.class, this::onInitialize)
                .onMessage(ReceiveMessage.class, this::onReceiveMessage)
                .onMessage(AssignTask.class, this::onAssignTask)
                .onMessage(UpdateProgress.class, this::onUpdateProgress)
                .onMessage(UpdateStatus.class, this::onUpdateStatus)
                .onMessage(Shutdown.class, this::onShutdown)
                .build();
    }

    private Behavior<Command> onInitialize(Initialize message) {
        this.registration = message.registration();
        this.createdAt = Instant.now();
        persistTerminal(TerminalStatus.IDLE);
        emitEvent(TerminalEventType.REGISTERED, null, null);
        appendLog("INFO", "Terminal registered");
        return this;
    }

    private Behavior<Command> onReceiveMessage(ReceiveMessage message) {
        appendLog("INFO", "Received from " + message.sender() + ": " + message.message());
        return this;
    }

    private Behavior<Command> onAssignTask(AssignTask command) {
        status = TerminalStatus.ACTIVE;
        persistTerminal(status);
        appendLog("INFO", "Assigned task %s: %s".formatted(command.taskId(), command.description()));
        emitEvent(
                TerminalEventType.STATUS_CHANGED,
                status,
                null);
        return this;
    }

    private Behavior<Command> onUpdateProgress(UpdateProgress command) {
        TaskProgress progress = command.progress();
        emitEvent(TerminalEventType.PROGRESS_UPDATED, status, progress);
        appendLog("DEBUG", "Progress for %s: %.2f (%s)".formatted(progress.taskId(), progress.progress(), progress.status()));
        return this;
    }

    private Behavior<Command> onUpdateStatus(UpdateStatus command) {
        this.status = command.status();
        persistTerminal(this.status);
        emitEvent(TerminalEventType.STATUS_CHANGED, this.status, null);
        appendLog("INFO", "Status updated to " + this.status);
        return this;
    }

    private Behavior<Command> onShutdown(Shutdown shutdown) {
        appendLog("INFO", "Terminal shutting down");
        emitEvent(TerminalEventType.STATUS_CHANGED, TerminalStatus.COMPLETED, null);
        return Behaviors.stopped();
    }

    private void appendLog(String level, String message) {
        UUID terminalId = registration.id();
        TerminalLogEntry entry = new TerminalLogEntry(Instant.now(), level, message);
        logs.add(entry);
        emitEvent(TerminalEventType.LOG_APPENDED, status, null, entry);
        TerminalLogEntity entity = new TerminalLogEntity(UUID.randomUUID(), terminalId, entry.timestamp(), level, message);
        logRepository.save(entity).subscribe();
    }

    private void persistTerminal(TerminalStatus status) {
        if (registration == null) {
            return;
        }
        Instant now = Instant.now();
        TerminalEntity entity =
                new TerminalEntity(registration.id(), registration.alias(), registration.role(), status, createdAt, now);
        terminalRepository.save(entity).subscribe();
    }

    private void emitEvent(TerminalEventType type, TerminalStatus status, TaskProgress progress) {
        emitEvent(type, status, progress, null);
    }

    private void emitEvent(
            TerminalEventType type, TerminalStatus status, TaskProgress progress, TerminalLogEntry logEntry) {
        if (registration == null) {
            return;
        }
        TerminalHandle handle = new TerminalHandle(registration.id(), registration.alias(), registration.role());
        TerminalEvent event = new TerminalEvent(
                registration.id(), handle, type, status == null ? this.status : status, logEntry, progress, Instant.now());
        eventPublisher.publish(event);
    }

    public TerminalState snapshot() {
        TerminalHandle handle = new TerminalHandle(registration.id(), registration.alias(), registration.role());
        return new TerminalState(handle, status, List.copyOf(logs));
    }
}
