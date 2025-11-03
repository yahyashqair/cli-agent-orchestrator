# Development Guide

This guide covers setting up your development environment and running tests for the CLI Agent Orchestrator project.

## Prerequisites

- Python 3.10 or higher
- [uv](https://docs.astral.sh/uv/) - Fast Python package installer and resolver
- Git
- tmux 3.2+ (for running the orchestrator and integration tests)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/awslabs/cli-agent-orchestrator.git
cd cli-agent-orchestrator/
```

### 2. Install Dependencies

The project uses `uv` for package management. Install all dependencies including development packages:

```bash
uv sync
```

This command:
- Creates a virtual environment (if one doesn't exist)
- Installs all project dependencies
- Installs development dependencies (pytest, coverage tools, linters, etc.)

### 3. Verify Installation

```bash
# Check that the CLI is available
uv run cao --help

# Run a quick test to ensure everything is working
uv run pytest test/providers/test_q_cli_unit.py -v -k "test_initialization"
```

## Running Tests

### Unit Tests

Unit tests are fast (< 1 second) and use mocked dependencies:

```bash
# Run all unit tests
uv run pytest test/providers/test_q_cli_unit.py -v

# Run Codex CLI unit tests
uv run pytest test/providers/test_codex_cli_unit.py -v

# Run with coverage report
uv run pytest test/providers/test_q_cli_unit.py --cov=src/cli_agent_orchestrator/providers/q_cli.py --cov-report=term-missing -v
uv run pytest test/providers/test_codex_cli_unit.py --cov=src/cli_agent_orchestrator/providers/codex_cli.py --cov-report=term-missing -v

# Run specific test class
uv run pytest test/providers/test_q_cli_unit.py::TestQCliProviderStatusDetection -v

# Run specific test
uv run pytest test/providers/test_q_cli_unit.py::TestQCliProviderStatusDetection::test_get_status_idle -v
```

### Integration Tests

Integration tests require Q CLI to be installed and authenticated:

```bash
# Run all integration tests (requires Q CLI setup)
uv run pytest test/providers/test_q_cli_integration.py -v

# Skip integration tests
uv run pytest test/providers/ -m "not integration" -v
```

**Requirements for Integration Tests:**
- Q CLI must be installed (`q` command available)
- Q CLI must be authenticated (AWS credentials configured)
- tmux 3.2+ must be installed

### Run All Tests

```bash
# Run all tests
uv run pytest -v

# Run tests with coverage for all modules
uv run pytest --cov=src --cov-report=term-missing -v

# Run tests in parallel (faster)
uv run pytest -n auto
```

### Test Markers

Tests are organized with pytest markers:

```bash
# Run only integration tests
uv run pytest -m integration -v

# Skip slow tests
uv run pytest -m "not slow" -v

# Run only async tests
uv run pytest -m asyncio -v
```

## Code Quality

### Formatting

The project uses `black` for code formatting:

```bash
# Format all Python files
uv run black src/ test/

# Check formatting without making changes
uv run black --check src/ test/
```

### Import Sorting

The project uses `isort` for organizing imports:

```bash
# Sort imports
uv run isort src/ test/

# Check import sorting without making changes
uv run isort --check-only src/ test/
```

### Type Checking

The project uses `mypy` for static type checking:

```bash
# Run type checker
uv run mypy src/
```

### Run All Quality Checks

```bash
# Format, sort imports, type check, and run tests
uv run black src/ test/
uv run isort src/ test/
uv run mypy src/
uv run pytest -v
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit code in `src/cli_agent_orchestrator/`

### 3. Add Tests

Add or update tests in `test/`

### 4. Run Tests Locally

```bash
# Run unit tests (fast)
uv run pytest test/providers/test_q_cli_unit.py -v

# Run all tests
uv run pytest -v
```

### 5. Check Code Quality

```bash
uv run black src/ test/
uv run isort src/ test/
uv run mypy src/
```

### 6. Commit and Push

```bash
git add .
git commit -m "Add feature: description"
git push origin feature/your-feature-name
```

### 7. Create Pull Request

Create a pull request on GitHub. CI/CD will automatically run tests.

## Working with the Q CLI Provider

### Regenerate Test Fixtures

If Q CLI output format changes:

```bash
uv run python test/providers/fixtures/generate_fixtures.py
```

### Test Against Real Q CLI

```bash
# Ensure Q CLI is available
which q

# Ensure Q CLI is authenticated
q status

# Run integration tests
uv run pytest test/providers/test_q_cli_integration.py -v
```

## Troubleshooting

### Import Errors

If you encounter import errors when running tests:

```bash
# Re-sync dependencies
uv sync

# If that doesn't work, remove the virtual environment and start fresh
rm -rf .venv
uv sync
```

### Test Failures

```bash
# Run with verbose output
uv run pytest -vv

# Run a specific failing test
uv run pytest test/path/to/test.py::test_name -vv

# Show print statements
uv run pytest -s
```

### Coverage Issues

```bash
# Generate detailed coverage report
uv run pytest --cov=src --cov-report=html
# Open htmlcov/index.html in your browser

# Show missing lines
uv run pytest --cov=src --cov-report=term-missing
```

## Adding New Dependencies

### Runtime Dependencies

```bash
# Add a new runtime dependency
uv add package-name

# Add with version constraint
uv add "package-name>=1.0.0"
```

### Development Dependencies

```bash
# Add a new development dependency
uv add --dev package-name
```

## Project Structure

```
cli-agent-orchestrator/
├── src/
│   └── cli_agent_orchestrator/     # Main source code
│       ├── api/                    # FastAPI server
│       ├── cli/                    # CLI commands
│       ├── clients/                # Database and tmux clients
│       ├── mcp_server/             # MCP server implementation
│       ├── models/                 # Data models
│       ├── providers/              # Agent providers (Q CLI, Claude Code)
│       ├── services/               # Business logic services
│       └── utils/                  # Utility functions
├── test/                           # Test suite
│   └── providers/                  # Provider tests
│       ├── fixtures/               # Test fixtures
│       ├── test_q_cli_unit.py     # Unit tests
│       └── test_q_cli_integration.py  # Integration tests
├── docs/                           # Documentation
├── examples/                       # Example workflows
├── pyproject.toml                  # Project configuration
└── uv.lock                         # Locked dependencies
```

## Running the Application

### Backend Server

The backend server provides the REST API and orchestration logic.

**Run in foreground (Terminal 1):**
```bash
cao-server
```

**Run in background:**
```bash
nohup cao-server > /tmp/cao-server.log 2>&1 &

# View logs
tail -f ~/.aws/cli-agent-orchestrator/logs/cao_*.log

# Or view the nohup log
tail -f /tmp/cao-server.log
```

**Server Details:**
- Default URL: `http://localhost:9889`
- Health check: `curl http://localhost:9889/health`
- API docs: `http://localhost:9889/docs`

**Stop background server:**
```bash
# Find the process
ps aux | grep cao-server

# Kill it
pkill -f cao-server
```

### Frontend UI

The frontend provides a web interface for monitoring and controlling agents.

**Run in foreground (Terminal 2):**
```bash
cd ui
npm install  # First time only
npm run dev
```

**Run in background:**
```bash
cd ui
nohup npm run dev > /tmp/cao-ui.log 2>&1 &

# View logs
tail -f /tmp/cao-ui.log
```

**UI Details:**
- Default URL: `http://localhost:3000` (or `http://localhost:3001` if 3000 is busy)
- Features:
  - Real-time dashboard with agent status
  - Live terminal output viewer
  - Session and terminal management
  - Launch new agents with custom settings
  - Send input to terminals directly

**Stop background UI:**
```bash
# Kill the npm process
pkill -f "npm run dev"
```

**Build for production:**
```bash
cd ui
npm run build
```

### Quick All-in-One Start

The fastest way to get everything running:

```bash
# Terminal 1: Start backend
cao-server

# Terminal 2: Start frontend (in a new terminal)
cd ui && npm run dev

# Open browser
# Navigate to http://localhost:3000
```

Or run everything in the background:

```bash
# Start backend in background
nohup cao-server > /tmp/cao-server.log 2>&1 &

# Start UI in background
cd ui && nohup npm run dev > /tmp/cao-ui.log 2>&1 &

# Open browser and navigate to http://localhost:3000
```

### CLI Usage (Alternative to UI)

You can also use the command-line interface instead of the web UI.

**Launch agents:**
```bash
# Install agent profile first
cao install developer

# Launch with default settings
cao launch --agents developer

# Launch with specific provider
cao launch --agents developer --provider claude_code
cao launch --agents developer --provider q_cli
cao launch --agents developer --provider codex_cli

# Launch with custom session name
cao launch --agents developer --session my-session
```

**Launch with custom working directory (via API):**
```bash
# Working directory support is available via API
curl -X POST "http://localhost:9889/sessions?provider=claude_code&agent_profile=developer&working_directory=/tmp"

# Or specify a project directory
curl -X POST "http://localhost:9889/sessions?provider=claude_code&agent_profile=developer&working_directory=/home/user/myproject"
```

### Working Directory Feature

When launching agents, you can specify a custom working directory.

**Via Web UI:**
1. Click "Launch New Agent"
2. Select provider and agent profile
3. Fill in the "Working Directory" field (e.g., `/tmp`, `/home/user/project`)
4. Leave empty to use the current directory
5. Click "Launch Agent"

**Via API:**
```bash
# Create session with working directory
curl -X POST "http://localhost:9889/sessions?provider=claude_code&agent_profile=developer&session_name=my-session&working_directory=/path/to/project"

# Add terminal to existing session with working directory
curl -X POST "http://localhost:9889/sessions/cao-my-session/terminals?provider=claude_code&agent_profile=developer&working_directory=/path/to/project"
```

**Verification:**
The tmux session will start in the specified directory. To verify:

```bash
# Attach to the session
tmux attach -t cao-<session-name>

# Suspend Claude Code with Ctrl+Z
# You'll see a shell prompt showing the directory: user@host:/your/directory$

# Resume Claude Code
fg
```

**Note:** The shell and tmux pane will be in the correct directory. However, when CLI providers (like Claude Code) execute commands through their internal tools, they may use their own working directory context.

### Managing Sessions

**List Sessions:**
```bash
# List all tmux sessions
tmux list-sessions

# List CAO sessions via API
curl http://localhost:9889/sessions
```

**Attach to Session:**
```bash
# Attach to a specific session
tmux attach -t cao-<session-name>

# Detach from session (inside tmux)
# Press: Ctrl+b, then d
```

**Switch Between Windows (inside tmux):**
- `Ctrl+b, then n` - Next window
- `Ctrl+b, then p` - Previous window
- `Ctrl+b, then <number>` - Go to window number (0-9)
- `Ctrl+b, then w` - List all windows (interactive selector)

**Delete Sessions:**
```bash
# Shutdown all CAO sessions
cao shutdown --all

# Shutdown specific session
cao shutdown --session cao-<session-name>

# Or via API
curl -X DELETE http://localhost:9889/sessions/cao-<session-name>
```

## Resources

- [Project README](README.md)
- [Test Documentation](test/providers/README.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [uv Documentation](https://docs.astral.sh/uv/)
- [pytest Documentation](https://docs.pytest.org/)
