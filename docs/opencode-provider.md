# OpenCode Provider Setup

This guide covers installing and configuring the OpenCode provider for CLI Agent Orchestrator.

## Prerequisites

- Node.js 16+ or one of the supported package managers
- OpenCode API account (for authentication)

## Installation

### Option 1: Install Script (Recommended)

```bash
curl -fsSL https://opencode.ai/install | bash
```

### Option 2: Package Managers

**Using npm:**
```bash
npm install -g opencode-ai
```

**Using Bun:**
```bash
bun install -g opencode-ai
```

**Using pnpm:**
```bash
pnpm install -g opencode-ai
```

**Using Yarn:**
```bash
yarn global add opencode-ai
```

### Option 3: Homebrew (macOS/Linux)

```bash
brew install opencode
```

### Option 4: Binary Download

Download the appropriate binary from the [OpenCode Releases](https://github.com/sst/opencode/releases) page.

## Authentication

### OpenCode Zen (Recommended)

1. Run the authentication command:
   ```bash
   opencode auth login
   ```

2. Select "opencode" as the provider

3. Head to [opencode.ai/auth](https://opencode.ai/auth)

4. Sign in, add your billing details, and copy your API key

5. Paste your API key when prompted

### Alternative Providers

You can also configure OpenCode to use other LLM providers. Run `opencode auth login` and select from the available providers. See the [OpenCode documentation](https://opencode.ai/docs/providers) for more details.

## Project Setup

1. Navigate to your project directory:
   ```bash
   cd /path/to/your/project
   ```

2. Initialize OpenCode for the project:
   ```bash
   opencode
   /init
   ```

   This will analyze your project and create an `AGENTS.md` file in the project root.

3. Commit the `AGENTS.md` file to Git (recommended):
   ```bash
   git add AGENTS.md
   git commit -m "Add OpenCode AGENTS.md configuration"
   ```

## Using with CLI Agent Orchestrator

### Basic Usage

Launch a session with OpenCode:
```bash
uv run cao launch --agents your-agent-profile --provider opencode
```

### Agent Profile Configuration

Create an agent profile that specifies OpenCode as the provider:

```yaml
# profiles/opencode-agent.yaml
name: "OpenCode Agent"
description: "Agent using OpenCode provider"
provider: "opencode"
system_prompt: |
  You are a helpful coding assistant. Use the OpenCode tools to analyze, modify, and improve the codebase.
mcpServers:
  filesystem:
    command: "npx"
    args: ["@modelcontextprotocol/server-filesystem", "/path/to/project"]
```

### Plan vs Build Mode

OpenCode supports two modes:

- **Plan Mode**: Suggests changes without implementing them
- **Build Mode**: Implements changes directly

Switch between modes using the Tab key in the OpenCode interface.

## Features

### File Reference

Use the `@` key to fuzzy search for files in the project:
```
How is authentication handled in @packages/functions/src/api/index.ts
```

### Image Support

Drag and drop images into the terminal to include them in prompts:
```
Take a look at this image and use it as a reference. [Image #1]
```

### Multi-step Planning

OpenCode can create detailed implementation plans before coding:

1. Switch to Plan Mode with `<Tab>`
2. Describe the feature you want
3. Review the suggested plan
4. Switch to Build Mode with `<Tab>`
5. Ask OpenCode to implement the plan

## Status Detection

The CLI Agent Orchestrator monitors OpenCode status through these patterns:

- **Idle**: `→` prompt (ready for input)
- **Processing**: `⚡ Working...` or similar activity indicators
- **Waiting User Answer**: `❯` with numbered options
- **Completed**: `✓` response marker followed by idle prompt
- **Plan Mode**: `[Plan]` indicator in output
- **Build Mode**: `[Build]` indicator in output

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:

1. Verify your API key is valid:
   ```bash
   opencode auth status
   ```

2. Re-authenticate if needed:
   ```bash
   opencode auth login
   ```

### Initialization Timeout

If OpenCode initialization times out:

1. Ensure the OpenCode CLI is properly installed and in your PATH
2. Check that you're authenticated with OpenCode
3. Verify network connectivity to OpenCode services

### Project Analysis Issues

If `/init` fails to analyze your project:

1. Ensure you're in a valid project directory
2. Check that the directory contains recognizable code files
3. Try running OpenCode manually first to verify setup

## Integration Examples

### Basic Code Analysis

```bash
# Launch with OpenCode
uv run cao launch --agents code-analyzer --provider opencode

# Send a request to analyze code
curl -X POST http://localhost:9889/terminals/{terminal_id}/input \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze the authentication flow in @src/auth/"}'
```

### Feature Implementation

```bash
# Launch for feature development
uv run cao launch --agents feature-dev --provider opencode

# Request feature implementation
curl -X POST http://localhost:9889/terminals/{terminal_id}/input \
  -H "Content-Type: application/json" \
  -d '{"message": "Add user profile editing functionality with the following requirements: 1. Profile picture upload 2. Bio editing 3. Social links management"}'
```

### Code Review

```bash
# Launch for code review
uv run cao launch --agents code-reviewer --provider opencode

# Request code review
curl -X POST http://localhost:9889/terminals/{terminal_id}/input \
  -H "Content-Type: application/json" \
  -d '{"message": "Review the recent changes in the PR and suggest improvements for security and performance"}'
```

## Configuration Options

OpenCode supports various configuration options through agent profiles:

- **System Prompt**: Custom instructions for the AI
- **MCP Servers**: Additional tools and capabilities
- **Model Selection**: Choose specific AI models (if supported by provider)

See the [Agent Profiles](agent-profile.md) documentation for more details on configuration.

## Next Steps

- Explore the [API documentation](api.md) for programmatic usage
- Learn about [agent profiles](agent-profile.md) for advanced configuration
- Check the [integration tests](../../test/providers/test_opencode_integration.py) for more usage examples
