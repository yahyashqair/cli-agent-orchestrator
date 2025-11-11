package com.yahyashqair.jao.events;

import java.util.Objects;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class TerminalEventPublisher {
    private final Sinks.Many<TerminalEvent> sink =
            Sinks.many().multicast().directBestEffort();

    public void publish(TerminalEvent event) {
        Objects.requireNonNull(event, "event");
        sink.emitNext(event, Sinks.EmitFailureHandler.FAIL_FAST);
    }

    public Flux<TerminalEvent> stream() {
        return sink.asFlux();
    }
}
