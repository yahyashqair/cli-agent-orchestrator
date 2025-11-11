package com.yahyashqair.jao.cli;

import com.yahyashqair.jao.Application;
import com.yahyashqair.jao.domain.TerminalHandle;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.ParentCommand;

@Command(
        name = "jao",
        description = "Java Agent Orchestrator CLI",
        subcommands = {JaoCommand.ServerCommand.class, JaoCommand.LaunchCommand.class, FlowCommand.class, JaoCommand.ShutdownCommand.class},
        mixinStandardHelpOptions = true)
public class JaoCommand implements Runnable {

    @Option(names = {"-s", "--server"}, description = "Base server URL", defaultValue = "http://localhost:8080")
    String serverUrl;

    public static void main(String[] args) {
        int exitCode = new CommandLine(new JaoCommand()).execute(args);
        System.exit(exitCode);
    }

    @Override
    public void run() {
        CommandLine.usage(this, System.out);
    }

    @Command(name = "server", description = "Start the orchestrator server")
    static class ServerCommand implements Runnable {
        @Override
        public void run() {
            Application.main(new String[] {});
        }
    }

    @Command(name = "launch", description = "Register a new terminal actor")
    static class LaunchCommand implements Runnable {

        @ParentCommand
        JaoCommand parent;

        @Option(names = "--alias", required = true, description = "Terminal alias")
        String alias;

        @Option(names = "--role", required = true, description = "Terminal role")
        String role;

        @Override
        public void run() {
            JaoClient client = new JaoClient(parent.serverUrl);
            TerminalHandle handle = client.registerTerminal(alias, role);
            System.out.printf("Registered terminal %s (%s) with id %s%n", handle.alias(), handle.role(), handle.id());
        }
    }

    @Command(name = "shutdown", description = "Request a graceful orchestrator shutdown")
    static class ShutdownCommand implements Runnable {

        @ParentCommand
        JaoCommand parent;

        @Override
        public void run() {
            JaoClient client = new JaoClient(parent.serverUrl);
            client.shutdown();
            System.out.println("Shutdown signal sent to orchestrator");
        }
    }
}

@Command(name = "flow", description = "Manage orchestrated flows", subcommands = {
        FlowCommand.Add.class,
        FlowCommand.ListFlows.class,
        FlowCommand.Run.class
})
class FlowCommand implements Runnable {

    @ParentCommand
    JaoCommand parent;

    @Override
    public void run() {
        CommandLine.usage(this, System.out);
    }

    @Command(name = "add", description = "Add a flow definition")
    static class Add implements Runnable {

        @ParentCommand
        FlowCommand parent;

        @Option(names = "--name", required = true)
        String name;

        @Option(names = "--description", description = "Flow description")
        String description;

        @Option(names = "--task", required = true, arity = "1..*", description = "Task entries")
        String[] tasks;

        @Override
        public void run() {
            JaoClient client = new JaoClient(parent.parent.serverUrl);
            client.addFlow(name, description, Arrays.asList(tasks));
            System.out.println("Flow created: " + name);
        }
    }

    @Command(name = "list", description = "List flow definitions")
    static class ListFlows implements Runnable {

        @ParentCommand
        FlowCommand parent;

        @Override
        public void run() {
            JaoClient client = new JaoClient(parent.parent.serverUrl);
            List<java.util.Map<String, Object>> flows = client.listFlows();
            flows.forEach(flow -> System.out.printf(
                    "%s %s%n",
                    flow.getOrDefault("id", "unknown"),
                    flow.getOrDefault("name", "")));
        }
    }

    @Command(name = "run", description = "Run a flow for a target alias")
    static class Run implements Runnable {

        @ParentCommand
        FlowCommand parent;

        @Option(names = "--flow-id", required = true)
        UUID flowId;

        @Option(names = "--target", required = true, description = "Target terminal alias")
        String targetAlias;

        @Override
        public void run() {
            JaoClient client = new JaoClient(parent.parent.serverUrl);
            client.runFlow(flowId, targetAlias);
            System.out.printf("Flow %s started for %s%n", flowId, targetAlias);
        }
    }
}
