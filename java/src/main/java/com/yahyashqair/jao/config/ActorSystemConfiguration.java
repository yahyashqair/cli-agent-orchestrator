package com.yahyashqair.jao.config;

import com.yahyashqair.jao.actor.SessionOrchestrator;
import com.yahyashqair.jao.service.TerminalPersistenceGateway;
import com.yahyashqair.jao.service.TerminalPublisher;
import jakarta.annotation.PreDestroy;
import org.apache.pekko.actor.typed.ActorSystem;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ActorSystemConfiguration {

    private final TerminalPersistenceGateway persistenceGateway;
    private final TerminalPublisher publisher;
    private ActorSystem<SessionOrchestrator.Command> system;

    public ActorSystemConfiguration(TerminalPersistenceGateway persistenceGateway, TerminalPublisher publisher) {
        this.persistenceGateway = persistenceGateway;
        this.publisher = publisher;
    }

    @Bean
    public ActorSystem<SessionOrchestrator.Command> actorSystem() {
        this.system = ActorSystem.create(
                SessionOrchestrator.create(persistenceGateway, publisher), "session-orchestrator-system");
        return this.system;
    }

    @PreDestroy
    public void shutdown() {
        if (system != null) {
            system.terminate();
        }
    }
}
