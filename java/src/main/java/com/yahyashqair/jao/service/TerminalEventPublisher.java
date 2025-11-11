package com.yahyashqair.jao.service;

import com.yahyashqair.jao.domain.events.TerminalEvent;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class TerminalEventPublisher implements TerminalPublisher {

    private final Sinks.Many<TerminalEvent> sink = Sinks.many().multicast().directBestEffort();

    @Override
    public void publish(TerminalEvent event) {
        sink.tryEmitNext(event);
    }

    @Override
    public Flux<TerminalEvent> stream() {
        return sink.asFlux();
    }
}
