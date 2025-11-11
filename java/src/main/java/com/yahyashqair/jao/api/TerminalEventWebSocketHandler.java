package com.yahyashqair.jao.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yahyashqair.jao.events.TerminalEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class TerminalEventWebSocketHandler implements WebSocketHandler {

    private final TerminalEventPublisher publisher;
    private final ObjectMapper mapper;

    public TerminalEventWebSocketHandler(TerminalEventPublisher publisher, ObjectMapper mapper) {
        this.publisher = publisher;
        this.mapper = mapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        Flux<WebSocketMessage> stream = publisher
                .stream()
                .map(this::serialize)
                .map(session::textMessage);
        return session.send(stream);
    }

    private String serialize(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Unable to serialize event", e);
        }
    }
}
