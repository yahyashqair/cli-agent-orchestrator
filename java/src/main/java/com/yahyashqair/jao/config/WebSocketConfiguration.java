package com.yahyashqair.jao.config;

import com.yahyashqair.jao.api.TerminalEventWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.config.EnableWebFlux;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerMapping;

import java.util.Map;

@Configuration
@EnableWebFlux
public class WebSocketConfiguration {

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }

    @Bean
    public WebSocketHandlerMapping webSocketHandlerMapping(TerminalEventWebSocketHandler handler) {
        WebSocketHandlerMapping mapping = new WebSocketHandlerMapping();
        mapping.setUrlMap(Map.of("/ws/terminal-events", handler));
        mapping.setOrder(-1);
        return mapping;
    }
}
