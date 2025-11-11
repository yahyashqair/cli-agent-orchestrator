package com.yahyashqair.jao.config;

import com.yahyashqair.jao.actor.SessionOrchestrator;
import com.yahyashqair.jao.actor.TerminalActor;
import com.yahyashqair.jao.events.TerminalEventPublisher;
import com.yahyashqair.jao.persistence.TerminalLogRepository;
import com.yahyashqair.jao.persistence.TerminalRepository;
import jakarta.annotation.PreDestroy;
import org.apache.pekko.actor.typed.ActorSystem;
import org.apache.pekko.actor.typed.Behavior;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ActorSystemConfiguration {

    private ActorSystem<SessionOrchestrator.Command> actorSystem;

    @Bean
    public SessionOrchestrator.TerminalActorFactory terminalActorFactory(
            TerminalRepository terminalRepository,
            TerminalLogRepository terminalLogRepository,
            TerminalEventPublisher eventPublisher) {
        return () -> TerminalActor.create(terminalRepository, terminalLogRepository, eventPublisher);
    }

    @Bean
    public ActorSystem<SessionOrchestrator.Command> actorSystem(SessionOrchestrator.TerminalActorFactory factory) {
        Behavior<SessionOrchestrator.Command> behavior = SessionOrchestrator.create(factory);
        actorSystem = ActorSystem.create(behavior, "jao-orchestrator");
        return actorSystem;
    }

    @PreDestroy
    public void shutdown() {
        if (actorSystem != null) {
            actorSystem.terminate();
        }
    }
}
