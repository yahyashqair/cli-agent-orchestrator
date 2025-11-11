package com.yahyashqair.jao.service;

import com.yahyashqair.jao.domain.events.TerminalEvent;
import reactor.core.publisher.Flux;

public interface TerminalPublisher {
    void publish(TerminalEvent event);

    Flux<TerminalEvent> stream();
}
