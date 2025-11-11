package com.yahyashqair.jao;

import com.yahyashqair.jao.domain.TerminalHandle;
import com.yahyashqair.jao.domain.TerminalStatus;
import com.yahyashqair.jao.persistence.TerminalLogEntity;
import com.yahyashqair.jao.persistence.TerminalLogRepository;
import com.yahyashqair.jao.persistence.TerminalRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import reactor.test.StepVerifier;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class OrchestrationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () -> String.format(
                "r2dbc:postgresql://%s:%d/%s",
                postgres.getHost(),
                postgres.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT),
                postgres.getDatabaseName()));
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
    }

    @Autowired
    WebTestClient webTestClient;

    @Autowired
    TerminalRepository terminalRepository;

    @Autowired
    TerminalLogRepository logRepository;

    @Test
    void shouldRegisterAndRouteMessagesByAliasAndHandle() {
        TerminalHandle supervisor = register("supervisor", "orchestrator");
        TerminalHandle developer = register("developer", "builder");

        sendMessage(developer.id().toString(), Map.of("sender", supervisor.alias(), "message", "hello"));

        assign(developer.alias(), Map.of("taskId", "task-1", "description", "Implement feature"));

        sendMessage("owner(task-1)", Map.of("sender", supervisor.alias(), "message", "status?"));

        StepVerifier.create(terminalRepository.findByAlias("developer"))
                .expectNextMatches(entity -> entity.getStatus() == TerminalStatus.ACTIVE)
                .verifyComplete();

        StepVerifier.create(logRepository
                        .findByTerminalIdOrderByTimestampDesc(developer.id(), PageRequest.of(0, 10))
                        .collectList())
                .expectNextMatches(entries -> entries.stream().anyMatch(log -> log.getMessage().contains("Assigned task")))
                .verifyComplete();
    }

    @Test
    void shouldRunFlowAndAssignTasks() {
        TerminalHandle worker = register("worker", "generalist");

        Map<String, Object> flow = webTestClient
                .post()
                .uri("/api/flows")
                .bodyValue(Map.of(
                        "name", "demo",
                        "description", "Demo flow",
                        "tasks", java.util.List.of("Task A", "Task B")))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(Map.class)
                .returnResult()
                .getResponseBody();

        UUID flowId = UUID.fromString(flow.get("id").toString());

        webTestClient
                .post()
                .uri("/api/flows/{id}/run", flowId)
                .bodyValue(Map.of("targetAlias", worker.alias()))
                .exchange()
                .expectStatus()
                .isOk();

        StepVerifier.create(logRepository
                        .findByTerminalIdOrderByTimestampDesc(worker.id(), PageRequest.of(0, 20))
                        .collectList())
                .expectNextMatches(list -> list.stream()
                        .map(TerminalLogEntity::getMessage)
                        .filter(message -> message.startsWith("Assigned task"))
                        .count()
                        >= 2)
                .verifyComplete();
    }

    private TerminalHandle register(String alias, String role) {
        return webTestClient
                .post()
                .uri("/api/terminals")
                .bodyValue(Map.of("alias", alias, "role", role))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody(TerminalHandle.class)
                .returnResult()
                .getResponseBody();
    }

    private void sendMessage(String target, Map<String, Object> body) {
        webTestClient
                .post()
                .uri("/api/terminals/{target}/messages", target)
                .bodyValue(body)
                .exchange()
                .expectStatus()
                .isOk();
    }

    private void assign(String target, Map<String, Object> body) {
        webTestClient
                .post()
                .uri("/api/terminals/{target}/assign", target)
                .bodyValue(body)
                .exchange()
                .expectStatus()
                .isOk();
    }
}
