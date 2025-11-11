package com.yahyashqair.jao.cli;

import com.yahyashqair.jao.JavaAgentOrchestratorApplication;
import com.yahyashqair.jao.domain.AssignTaskRequest;
import com.yahyashqair.jao.domain.FlowDefinition;
import com.yahyashqair.jao.domain.SendMessageRequest;
import com.yahyashqair.jao.domain.TerminalRegistrationRequest;
import com.yahyashqair.jao.domain.UpdateProgressRequest;
import com.yahyashqair.jao.domain.UpdateStatusRequest;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import org.springframework.boot.SpringApplication;
import org.springframework.web.reactive.function.client.WebClient;
import picocli.CommandLine;
import reactor.core.publisher.Mono;

@CommandLine.Command(
        name = "jao",
        mixinStandardHelpOptions = true,
        subcommands = {
            JaoCli.ServerCommand.class,
            JaoCli.LaunchCommand.class,
            JaoCli.FlowCommand.class,
            JaoCli.ShutdownCommand.class
        },
        description = "Java Agent Orchestrator CLI (aliases: cao)")
public class JaoCli implements Runnable {

    public static void main(String[] args) {
        int exitCode = new CommandLine(new JaoCli()).setExecutionStrategy(new CommandLine.RunAll()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public void run() {
        CommandLine.usage(this, System.out);
    }

    @CommandLine.Command(name = "server", description = "Start the orchestrator server")
    public static class ServerCommand implements Callable<Integer> {

        @CommandLine.Option(names = "--port", description = "Port to listen on", defaultValue = "8080")
        int port;

        @Override
        public Integer call() {
            SpringApplication app = new SpringApplication(JavaAgentOrchestratorApplication.class);
            app.setDefaultProperties(java.util.Map.of("server.port", port));
            app.run();
            return 0;
        }
    }

    @CommandLine.Command(name = "launch", description = "Register a new terminal actor")
    public static class LaunchCommand implements Callable<Integer> {

        @CommandLine.Option(names = "--alias", required = true)
        String alias;

        @CommandLine.Option(names = "--role", required = true)
        String role;

        @CommandLine.Option(names = "--handles", split = ",")
        List<String> handles;

        @CommandLine.Option(names = "--server", description = "Server URL", defaultValue = "http://localhost:8080")
        String server;

        @Override
        public Integer call() {
            WebClient client = WebClient.create(server);
            TerminalRegistrationRequest request =
                    new TerminalRegistrationRequest(alias, role, handles == null ? List.of() : handles);
            Mono<String> response = client
                    .post()
                    .uri("/api/terminals")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(String.class);
            String result = response.block();
            System.out.println(result);
            return 0;
        }
    }

    @CommandLine.Command(name = "flow", description = "Manage flows", subcommands = {
        FlowCommand.Add.class,
        FlowCommand.ListFlows.class,
        FlowCommand.Run.class
    })
    public static class FlowCommand implements Runnable {

        @Override
        public void run() {
            CommandLine.usage(this, System.out);
        }

        abstract static class BaseFlowCommand implements Callable<Integer> {
            @CommandLine.Option(names = "--server", defaultValue = "http://localhost:8080")
            String server;

            WebClient client() {
                return WebClient.create(server);
            }
        }

        @CommandLine.Command(name = "add", description = "Create a new flow")
        public static class Add extends BaseFlowCommand {
            @CommandLine.Option(names = "--name", required = true)
            String name;

            @CommandLine.Option(names = "--spec", required = true)
            String spec;

            @Override
            public Integer call() {
                FlowDefinition definition = new FlowDefinition(name, spec);
                String result = client()
                        .post()
                        .uri("/api/flows")
                        .bodyValue(definition)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                System.out.println(result);
                return 0;
            }
        }

        @CommandLine.Command(name = "list", description = "List available flows")
        public static class ListFlows extends BaseFlowCommand {
            @Override
            public Integer call() {
                String result = client()
                        .get()
                        .uri("/api/flows")
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                System.out.println(result);
                return 0;
            }
        }

        @CommandLine.Command(name = "run", description = "Trigger a flow run by sending an assign message")
        public static class Run extends BaseFlowCommand {
            @CommandLine.Option(names = "--target", required = true, description = "Route value")
            String target;

            @CommandLine.Option(names = "--route", defaultValue = "alias", description = "Route type: id, alias, handle")
            String routeType;

            @CommandLine.Option(names = "--task", required = true)
            String taskId;

            @CommandLine.Option(names = "--description", required = true)
            String description;

            @Override
            public Integer call() {
                AssignTaskRequest request =
                        new AssignTaskRequest(routeType, target, taskId, description);
                String result = client()
                        .post()
                        .uri("/api/messages/assign")
                        .bodyValue(request)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                System.out.println(result);
                return 0;
            }
        }
    }

    @CommandLine.Command(name = "shutdown", description = "Stop the running orchestrator")
    public static class ShutdownCommand implements Callable<Integer> {

        @CommandLine.Option(names = "--server", defaultValue = "http://localhost:8080")
        String server;

        @Override
        public Integer call() {
            String result = WebClient.create(server)
                    .post()
                    .uri("/actuator/shutdown")
                    .retrieve()
                    .bodyToMono(String.class)
                    .blockOptional()
                    .orElse("Shutdown request sent");
            System.out.println(result);
            return 0;
        }
    }
}
