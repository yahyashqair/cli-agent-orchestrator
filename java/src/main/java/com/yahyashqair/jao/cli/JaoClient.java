package com.yahyashqair.jao.cli;

import com.yahyashqair.jao.domain.TerminalHandle;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class JaoClient {

    private final WebClient webClient;

    public JaoClient(String baseUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public TerminalHandle registerTerminal(String alias, String role) {
        return webClient
                .post()
                .uri("/api/terminals")
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(Map.of("alias", alias, "role", role)))
                .retrieve()
                .bodyToMono(TerminalHandle.class)
                .block(Duration.ofSeconds(5));
    }

    public List<Map<String, Object>> listTerminals() {
        Flux<Map<String, Object>> flux = webClient
                .get()
                .uri("/api/terminals")
                .retrieve()
                .bodyToFlux(Map.class);
        return flux.collectList().block(Duration.ofSeconds(5));
    }

    public Map<String, Object> addFlow(String name, String description, List<String> tasks) {
        return webClient
                .post()
                .uri("/api/flows")
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(Map.of(
                        "name", name,
                        "description", description,
                        "tasks", tasks)))
                .retrieve()
                .bodyToMono(Map.class)
                .block(Duration.ofSeconds(5));
    }

    public List<Map<String, Object>> listFlows() {
        return webClient
                .get()
                .uri("/api/flows")
                .retrieve()
                .bodyToFlux(Map.class)
                .collectList()
                .block(Duration.ofSeconds(5));
    }

    public void runFlow(UUID flowId, String targetAlias) {
        webClient
                .post()
                .uri("/api/flows/{id}/run", flowId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(Map.of("targetAlias", targetAlias)))
                .retrieve()
                .bodyToMono(Void.class)
                .block(Duration.ofSeconds(5));
    }

    public void shutdown() {
        webClient
                .post()
                .uri("/actuator/shutdown")
                .retrieve()
                .bodyToMono(Void.class)
                .block(Duration.ofSeconds(5));
    }
}
