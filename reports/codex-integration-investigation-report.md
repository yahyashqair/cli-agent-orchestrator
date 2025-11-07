# Codex CLI Integration Investigation Report

**Task ID:** `codex-integration-investigation-2025-11-07`

## Executive Summary
- Codex CLI sessions never reach a stable IDLE state because the provider launches `codex` with an extra positional argument (`codex <working_dir>`) instead of the required `--cd/-C` flag, so Codex treats the workspace path as a user prompt and stays on the default directory, breaking downstream tooling (`src/cli_agent_orchestrator/providers/codex_cli.py:88-108`).
- MCP bootstrap fails up-front whenever an agent profile defines servers: the provider passes an unsupported `--type` flag to `codex mcp add`, so Codex rejects the registration before any worker can start (`src/cli_agent_orchestrator/providers/codex_cli.py:170-214`, `codex mcp add --help`).
- The installed Codex binary itself currently aborts with `failed to initialize rollout recorder: Permission denied` when run in this environment, so even a corrected provider would still see runtime failures until filesystem permissions are addressed (`codex exec --skip-git-repo-check ...`).
- The Codex E2E harness cannot execute: `uv run pytest test/e2e/test_assign_codex_integration_e2e.py` is blocked by the sandboxed uv cache permissions (`os error 13`), and direct server launches fail because port 9889 is already bound, so no automated regression currently validates Codex flows (`tmp/codex_e2e_server_stderr.log`).
- Unit tests that document the intended Codex behavior are failing (3/10) because they have not been updated for the new environment-variable export logic, so regressions ship unchecked (`test/providers/test_codex_cli_unit.py`).

## Technical Analysis

### Section 1: Implementation Comparison

| Aspect | Claude Code (working) | Codex CLI (broken) | Impact |
| --- | --- | --- | --- |
| **Command construction** | Builds a single `claude` command string with `--append-system-prompt`/`--mcp-config` and optional `--dangerously-skip-permissions`, then launches once (`src/cli_agent_orchestrator/providers/claude_code.py:58-93`). | Sends multiple `export` commands and finally runs `codex <working_dir>` instead of `codex --cd <dir>` (`codex_cli.py:88-108`). | Codex misinterprets the positional path as part of the initial prompt, so the agent remains in the previous directory and ignores workspace hints. |
| **MCP setup** | Passes JSON config at launch; Claude owns registration (`claude_code.py:62-74`). | Calls `codex mcp add` for each server and appends `--type` + `--env` pairs manually (`codex_cli.py:170-214`). | `codex mcp add` has no `--type` flag, so registration fails before the CLI starts (confirmed via `codex mcp add --help`). |
| **Status detection** | Regex-based detection of ⏺ markers, prompts, and waiting cues (`claude_code.py:98-133`). | Relies on `•` bullets plus lowercase `working`/`esc to interrupt` tokens (`codex_cli.py:218-255`). | Works against captured fixtures, but is extremely brittle because it requires Codex to echo Unicode bullets without color codes. |
| **Message extraction** | Strips ANSI and reads everything after the last ⏺ marker (`claude_code.py:138-174`). | Searches for the last `›` prompt + `•` bullet after removing ANSI control sequences (`codex_cli.py:262-300`). | Codex output often nests ANSI OSC sequences; the strip routine is more aggressive, but still fails if Codex uses numbered lists or markdown headings instead of bullets. |
| **Exit handling** | Sends `/exit` (the CLI command) once (`claude_code.py:175-177`). | Sends double Ctrl+C control characters (`codex_cli.py:302-305`). | Works in busy states but risks killing Codex while it is writing the rollout recorder, exacerbating corruption errors seen in exec mode. |
| **Profile/system prompt** | Injected via CLI flags before launch; never typed through tmux (`claude_code.py:62-74`). | Profile text is typed into the tmux pane after Codex supposedly becomes idle (`codex_cli.py:113-126`). | If launch never reaches IDLE (e.g., due to mis-specified command), the prompt is never delivered, so Codex defaults to its stock behavior. |

### Section 2: Codex CLI Behavior
- `codex --help` documents the `-C/--cd` option for changing the working directory and shows that interactive runs accept a prompt argument (Appendix A.1). No syntax allows a bare positional directory path.
- `codex exec` provides `--skip-git-repo-check` and JSON output modes, but it currently crashes here with `failed to initialize rollout recorder: Permission denied (os error 13)` even on trivial prompts, indicating Codex expects to write to a directory the sandbox disallows (Appendix A.2).
- `codex mcp add --help` lists `--env`, `--url`, `--bearer-token-env-var`, but **no** `--type` flag, and ordering is `codex mcp add [OPTIONS] <COMMAND|--url <URL>> <NAME>` (Appendix A.3). The provider currently appends the name before the command.
- `codex mcp list` confirms global MCP entries already exist (cao-mcp-server, chrome-devtools, context7, selenium) and shows Codex records status/auth info; CAO should reuse this ability instead of re-registering on every initialization (Appendix A.4).
- Online documentation lookup was attempted (`curl https://openai.com`), but DNS resolution failed inside this sandbox (`curl: (6) Could not resolve host`); therefore references rely on the local README pointers to `https://developers.openai.com/codex/cli`.

### Section 3: Root Cause Analysis
1. **Invalid working-directory invocation** — The provider concatenates the workspace path directly after `codex` (`codex_cli.py:102-107`), which Codex treats as a prompt string per `codex --help`. Codex consequently runs in whatever directory it last used (usually `$HOME`), so CAO's `working_directory` contract is violated and tasks that rely on repo context fail. Evidence: `codex --help` (Appendix A.1) shows the only supported syntax is `codex --cd <DIR>` or `codex PROMPT`.
2. **MCP registration rejected** — `_ensure_mcp_servers_registered` adds `--type` (unsupported) and appends the server name before the command, yielding `codex mcp add --type stdio --env ... cao-mcp-server uv run ...`. Running that shape manually reproduces Codex's `error: unexpected argument '--type' found` (Appendix A.3). Because the E2E profile (`src/cli_agent_orchestrator/agent_store/codex_e2e_smoke.md`) always defines `cao-mcp-server`, initialization repeatedly logs warnings and Codex never receives its MCP metadata.
3. **Binary-level permission failure** — Even when bypassing CAO, `codex exec --skip-git-repo-check` dies immediately with `failed to initialize rollout recorder: Permission denied` (Appendix A.2). The error originates from Codex itself, meaning CAO cannot complete E2E flows in this environment until the rollout recorder path (usually `~/.cache/codex/rollouts/`) is writable.
4. **Test harness gaps** — The Codex E2E runner cannot even spin up the API server: `uv run pytest ...` hits the same uv cache permission error, and direct `cao-server` launches fail because port 9889 is already bound (`tmp/codex_e2e_server_stderr.log`). This masks regressions and makes it impossible to validate fixes without manual intervention.
5. **Out-of-date unit tests** — `test/providers/test_codex_cli_unit.py::TestCodexCliInitialization` assumes only one `export` happens before launching Codex, but the provider now exports three variables plus MCP env, causing deterministic failures (Appendix C.1). This prevents CI from acting as a safety net even for the broken behavior.

### Section 4: Pattern Matching Issues
- The status parser requires lowercase `working`/`esc to interrupt` tokens; fixtures show uppercase `Working` and ANSI sequences (`test/providers/fixtures/codex_processing_output.txt`), so the `lower()` normalization currently hides the mismatch, but it depends on stripping every CSI/OSC escape (`codex_cli.py:218-255`). Any future Codex update that emits emoji instead of bullets will break detection entirely.
- Approval prompts list tokens such as `"allow codex to run"`, but real approval banners often read `"Allow Codex to run this command? (y/n)"` with uppercase A; confirm actual output once the CLI runs again.
- `extract_last_message_from_script` searches for `›` followed by the last bullet, but real sessions can show Markdown headings (`## Result`) without bullets. Those would raise `ValueError("No Codex CLI response found")`, forcing the orchestrator into ERROR even though Codex responded.

### Section 5: Test Results
- `uv run pytest -v test/providers/test_codex_cli_unit.py` (run with elevated permissions) produced 3 failures: `test_initialize_success`, `test_initialize_registers_mcp_servers`, `test_initialize_sends_system_prompt`. Each failure shows the tmux `send_keys` calls no longer match expectations and that `--type` is inserted ahead of the command (Appendix C.1).
- `uv run pytest -v test/e2e/test_assign_codex_integration_e2e.py` cannot start because uv attempts to open `/home/yahyashqair/.cache/uv/sdists-v9/.git` and the sandbox denies it (Appendix C.2). Even if that hurdle were cleared, the server log captured in `tmp/codex_e2e_server_stderr.log` shows `ERROR: [Errno 98] ... address already in use`, so the E2E harness would still abort.

## Recommendations

### Immediate Fixes
1. **Correct the launch command** – Replace the positional directory with `codex --cd <dir>` (or `-C`) and keep the initial prompt separate. Also pass the profile system prompt via CLI flags instead of typing it later, mirroring the Claude provider (`codex_cli.py:102-118`).
2. **Fix MCP registration** – Drop the unsupported `--type` flag, follow the documented argument order (`codex mcp add <command...> <name>`), and only re-register servers when the current config differs from `codex mcp list` output.
3. **Stabilize tests** – Update `test/providers/test_codex_cli_unit.py` fixtures to reflect the real `export` sequence and re-enable these tests in CI so Codex regressions stop slipping through.
4. **Address filesystem permissions** – Ensure Codex can create its rollout recorder (likely under `~/.cache/codex`). Grant write access or redirect via `--config rollout_recorder.dir=<writable>`; otherwise every invocation will fail before CAO even interacts with the CLI.
5. **Free the API port before running E2E tests** – Terminate existing `cao-server` processes or allow the test harness to pick an ephemeral port so that E2E jobs no longer crash with `address already in use`.

### Long-term Improvements
1. **Provider abstraction parity** – Align provider interfaces so all CLIs receive working directory, profile prompts, and MCP metadata via their native flags instead of tmux keystrokes. This reduces brittleness and simplifies testing.
2. **Resilient parsing** – Extend Codex parsing to handle numbered lists, markdown headings, and non-bullet responses, ideally by watching for Codex's JSON event stream (if exposed) instead of raw terminal scraping.
3. **Test observability** – Add recorded Codex transcripts (success + failure) to `test/providers/fixtures/` and wire the E2E test into CI once the CLI is stable, capturing stdout/stderr so future investigators can diff behavior quickly.
4. **Documentation** – Augment `docs/` with Codex authentication, rollout recorder paths, and MCP expectations so contributors can configure the CLI without trial-and-error, especially now that network access is often blocked.

## Appendices

### Appendix A: Command Outputs
1. **`codex --help`**
```text
Codex CLI

If no subcommand is specified, options will be forwarded to the interactive CLI.

Usage: codex [OPTIONS] [PROMPT]
       codex [OPTIONS] <COMMAND> [ARGS]

Commands:
  exec        Run Codex non-interactively [aliases: e]
  login       Manage login
  logout      Remove stored authentication credentials
  mcp         [experimental] Run Codex as an MCP server and manage MCP servers
  mcp-server  [experimental] Run the Codex MCP server (stdio transport)
  app-server  [experimental] Run the app server
  completion  Generate shell completion scripts
  sandbox     Run commands within a Codex-provided sandbox [aliases: debug]
  apply       Apply the latest diff produced by Codex agent as a `git apply` to your local working
              tree [aliases: a]
  resume      Resume a previous interactive session (picker by default; use --last to continue the
              most recent)
  cloud       [EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally
  features    Inspect feature flags
  help        Print this message or the help of the given subcommand(s)

Arguments:
  [PROMPT]
          Optional user prompt to start the session

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as JSON. If it fails to parse as JSON, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -i, --image <FILE>...
          Optional image(s) to attach to the initial prompt

  -m, --model <MODEL>
          Model the agent should use

      --oss
          Convenience flag to select the local open source model provider. Equivalent to -c
          model_provider=oss; verifies a local Ollama server is running

  -p, --profile <CONFIG_PROFILE>
          Configuration profile from config.toml to specify default options

  -s, --sandbox <SANDBOX_MODE>
          Select the sandbox policy to use when executing model-generated shell commands
          
          [possible values: read-only, workspace-write, danger-full-access]

  -a, --ask-for-approval <APPROVAL_POLICY>
          Configure when the model requires human approval before executing a command

          Possible values:
          - untrusted:  Only run "trusted" commands (e.g. ls, cat, sed) without asking for user
            approval. Will escalate to the user if the model proposes a command that is not in the
            "trusted" set
          - on-failure: Run all commands without asking for user approval. Only asks for approval if
            a command fails to execute, in which case it will escalate to the user to ask for
            un-sandboxed execution
          - on-request: The model decides when to ask the user for approval
          - never:      Never ask for user approval Execution failures are immediately returned to
            the model

      --full-auto
          Convenience alias for low-friction sandboxed automatic execution (-a on-failure, --sandbox
          workspace-write)

      --dangerously-bypass-approvals-and-sandbox
          Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY
          DANGEROUS. Intended solely for running in environments that are externally sandboxed

  -C, --cd <DIR>
          Tell the agent to use the specified directory as its working root

      --search
          Enable web search (off by default). When enabled, the native Responses `web_search` tool
          is available to the model (no per-call approval)

      --add-dir <DIR>
          Additional directories that should be writable alongside the primary workspace

  -h, --help
          Print help (see a summary with '-h')

  -V, --version
          Print version
```
2. **`codex exec --skip-git-repo-check "Reply with the text: hello from codex exec"`**
```text
2025-11-07T13:53:44.246881Z ERROR codex_core::codex: failed to initialize rollout recorder: Permission denied (os error 13)
2025-11-07T13:53:44.246986Z ERROR codex_core::codex: Failed to create session: failed to initialize rollout recorder: Permission denied (os error 13)
Error: internal error; agent loop died unexpectedly
```
3. **`codex mcp add --type stdio echo test` (demonstrating the unsupported flag)**
```text
error: unexpected argument '--type' found
```
4. **`codex mcp list`**
```text
Name             Command  Args                                                                             Env  Cwd  Status   Auth
cao-mcp-server   uv       run --directory /home/yahyashqair/anonDev/cli-agent-orchestrator cao-mcp-server  -    -    enabled  Unsupported
chrome-devtools  npx      chrome-devtools-mcp@latest                                                       -    -    enabled  Unsupported
context7         npx      -y @upstash/context7-mcp --api-key ctx7sk-5fb0ef66-a7cc-4b14-80c8-96e2294b1efa   -    -    enabled  Unsupported
selenium         npx      -y @angiejones/mcp-selenium                                                      -    -    enabled  Unsupported
```
5. **Network lookup attempt**
```text
curl -I https://openai.com
curl: (6) Could not resolve host: openai.com
```

### Appendix B: Code Snippets
```python
# src/cli_agent_orchestrator/providers/codex_cli.py:88-108
runtime_env = {
    "CAO_TERMINAL_ID": self.terminal_id,
    "CAO_SESSION_NAME": self.session_name,
    "CAO_PROVIDER": PROVIDER_NAME,
}
...
if self.working_directory:
    command = f"codex {shlex.quote(self.working_directory)}"
else:
    command = "codex"
tmux_client.send_keys(self.session_name, self.window_name, command)
```
```python
# src/cli_agent_orchestrator/providers/codex_cli.py:170-181
cmd = ["codex", "mcp", "add"]
if server_type:
    cmd.extend(["--type", server_type])
for key, value in server_env.items():
    cmd.extend(["--env", f"{key}={value}"])
cmd.append(name)
cmd.extend(command_parts)
cmd.extend(args)
```

### Appendix C: Test & Log Excerpts
1. **Unit test failure (`uv run pytest -v test/providers/test_codex_cli_unit.py`)**
```text
AssertionError: assert [call('session', 'window', 'export CAO_TERMINAL_ID=abcd1234'), ...] == [...]
At index 1 diff: call('session', 'window', 'export CAO_SESSION_NAME=session') != call('session', 'window', 'codex')
...
error: unexpected argument '--type' found
```
2. **E2E harness failures**
```text
uv run pytest -v test/e2e/test_assign_codex_integration_e2e.py
error: failed to open file `/home/yahyashqair/.cache/uv/sdists-v9/.git`: Permission denied (os error 13)
```
```text
/tmp/codex_e2e_server_stderr.log
ERROR:    [Errno 98] error while attempting to bind on address ('127.0.0.1', 9889): address already in use
```

### Appendix D: External References
- Project README links to the official Codex CLI guide: `https://developers.openai.com/codex/cli` (`README.md:25`). External HTTP requests were blocked in this environment, so the investigation relied on local help output instead.
