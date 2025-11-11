package com.yahyashqair.jao.actor;

import com.yahyashqair.jao.domain.TerminalHandle;
import com.yahyashqair.jao.domain.TerminalRegistration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.apache.pekko.actor.typed.ActorRef;
import org.apache.pekko.actor.typed.Behavior;
import org.apache.pekko.actor.typed.javadsl.AbstractBehavior;
import org.apache.pekko.actor.typed.javadsl.ActorContext;
import org.apache.pekko.actor.typed.javadsl.Behaviors;

public class SessionOrchestrator extends AbstractBehavior<SessionOrchestrator.Command> {

    public interface TerminalActorFactory {
        Behavior<TerminalActor.Command> create();
    }

    public interface Command {}

    public record RegisterTerminal(
            TerminalRegistration registration, ActorRef<RegistrationAck> replyTo) implements Command {}

    public record RegistrationAck(TerminalHandle handle) {}

    public record RouteById(UUID terminalId, TerminalActor.Command payload) implements Command {}

    public record RouteByAlias(String alias, TerminalActor.Command payload) implements Command {}

    public record RouteByHandle(String handle, TerminalActor.Command payload) implements Command {}

    public record RegisterHandle(UUID terminalId, String handle) implements Command {}

    public record RemoveTerminal(UUID terminalId) implements Command {}

    private final TerminalActorFactory terminalActorFactory;
    private final Map<UUID, ActorRef<TerminalActor.Command>> terminals = new HashMap<>();
    private final Map<String, UUID> aliasToId = new HashMap<>();
    private final Map<String, UUID> handleToId = new HashMap<>();

    public static Behavior<Command> create(TerminalActorFactory terminalActorFactory) {
        return Behaviors.setup(context -> new SessionOrchestrator(context, terminalActorFactory));
    }

    private SessionOrchestrator(ActorContext<Command> context, TerminalActorFactory terminalActorFactory) {
        super(context);
        this.terminalActorFactory = terminalActorFactory;
    }

    @Override
    public Behavior<Command> createReceive() {
        return newReceiveBuilder()
                .onMessage(RegisterTerminal.class, this::onRegisterTerminal)
                .onMessage(RouteById.class, this::onRouteById)
                .onMessage(RouteByAlias.class, this::onRouteByAlias)
                .onMessage(RouteByHandle.class, this::onRouteByHandle)
                .onMessage(RegisterHandle.class, this::onRegisterHandle)
                .onMessage(RemoveTerminal.class, this::onRemoveTerminal)
                .build();
    }

    private Behavior<Command> onRegisterTerminal(RegisterTerminal command) {
        TerminalRegistration registration = command.registration();
        ActorRef<TerminalActor.Command> actor =
                getContext().spawn(terminalActorFactory.create(), "terminal-" + registration.id());
        actor.tell(new TerminalActor.Initialize(registration));
        terminals.put(registration.id(), actor);
        aliasToId.put(registration.alias(), registration.id());
        TerminalHandle handle = new TerminalHandle(registration.id(), registration.alias(), registration.role());
        command.replyTo().tell(new RegistrationAck(handle));
        return this;
    }

    private Behavior<Command> onRouteById(RouteById command) {
        ActorRef<TerminalActor.Command> actor = terminals.get(command.terminalId());
        if (actor != null) {
            actor.tell(command.payload());
        } else {
            getContext().getLog().warning("Terminal with id {} not found", command.terminalId());
        }
        return this;
    }

    private Behavior<Command> onRouteByAlias(RouteByAlias command) {
        UUID id = aliasToId.get(command.alias());
        if (id == null) {
            getContext().getLog().warning("Terminal with alias {} not found", command.alias());
            return this;
        }
        return onRouteById(new RouteById(id, command.payload()));
    }

    private Behavior<Command> onRouteByHandle(RouteByHandle command) {
        UUID id = handleToId.get(command.handle());
        if (id == null) {
            getContext().getLog().warning("Terminal handle {} not found", command.handle());
            return this;
        }
        return onRouteById(new RouteById(id, command.payload()));
    }

    private Behavior<Command> onRegisterHandle(RegisterHandle command) {
        handleToId.put(command.handle(), command.terminalId());
        return this;
    }

    private Behavior<Command> onRemoveTerminal(RemoveTerminal command) {
        UUID id = command.terminalId();
        ActorRef<TerminalActor.Command> actor = terminals.remove(id);
        if (actor != null) {
            getContext().stop(actor);
        }
        Optional<String> alias = aliasToId.entrySet().stream()
                .filter(entry -> entry.getValue().equals(id))
                .map(Map.Entry::getKey)
                .findFirst();
        alias.ifPresent(aliasToId::remove);
        handleToId.values().removeIf(value -> value.equals(id));
        return this;
    }
}
