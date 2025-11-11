package com.yahyashqair.jao.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yahyashqair.jao.domain.events.TerminalEvent;
import com.yahyashqair.jao.service.TerminalPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

@Component
public class TerminalEventWebSocketHandler implements WebSocketHandler {

    private final TerminalPublisher publisher;
    private final ObjectMapper objectMapper;

    public TerminalEventWebSocketHandler(TerminalPublisher publisher, ObjectMapper objectMapper) {
        this.publisher = publisher;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        return session.send(
                publisher.stream().map(event -> toMessage(session, event)).onErrorResume(e -> Mono.empty()));
    }

    private WebSocketMessage toMessage(WebSocketSession session, TerminalEvent event) {
        try {
            return session.textMessage(objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException e) {
            return session.textMessage("{\"error\":\"serialization_failure\"}");
        }
    }
}
