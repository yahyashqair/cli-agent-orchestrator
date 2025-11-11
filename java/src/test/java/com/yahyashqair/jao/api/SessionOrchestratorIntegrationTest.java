package com.yahyashqair.jao.api;

import com.yahyashqair.jao.domain.AssignTaskRequest;
import com.yahyashqair.jao.domain.SendMessageRequest;
import com.yahyashqair.jao.domain.TerminalRegistrationRequest;
import com.yahyashqair.jao.domain.TerminalStatus;
import java.time.Duration;
import java.util.List;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class SessionOrchestratorIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureR2dbc(DynamicPropertyRegistry registry) {
        registry.add(
                "spring.r2dbc.url",
                () ->
                        String.format(
                                "r2dbc:postgresql://%s:%d/%s",
                                postgres.getHost(),
                                postgres.getMappedPort(PostgreSQLContainer.POSTGRESQL_PORT),
                                postgres.getDatabaseName()));
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
        registry.add("spring.sql.init.mode", () -> "always");
    }

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void registersTerminalAndRoutesMessages() {
        TerminalRegistrationRequest request = new TerminalRegistrationRequest("developer", "engineer", List.of("owner(task-1)"));

        webTestClient
                .post()
                .uri("/api/terminals")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .exchange()
                .expectStatus()
                .isCreated();

        SendMessageRequest messageRequest = new SendMessageRequest("alias", "developer", "Hello from integration test");

        webTestClient
                .post()
                .uri("/api/messages/send")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(messageRequest)
                .exchange()
                .expectStatus()
                .isOk();

        Awaitility.await()
                .atMost(Duration.ofSeconds(5))
                .untilAsserted(() ->
                        webTestClient
                                .get()
                                .uri("/api/terminals")
                                .exchange()
                                .expectStatus()
                                .isOk()
                                .expectBody()
                                .jsonPath("$[0].status")
                                .isEqualTo(TerminalStatus.PROCESSING.name()));
    }

    @Test
    void assignsTasksThroughFlowEndpoint() {
        TerminalRegistrationRequest request = new TerminalRegistrationRequest("reviewer", "qa", List.of());
        webTestClient.post().uri("/api/terminals").contentType(MediaType.APPLICATION_JSON).bodyValue(request).exchange();

        AssignTaskRequest assignRequest = new AssignTaskRequest("alias", "reviewer", "task-qa", "Verify release");

        webTestClient
                .post()
                .uri("/api/messages/assign")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(assignRequest)
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.success")
                .isEqualTo(true);
    }
}
