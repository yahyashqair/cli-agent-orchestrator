# Getting Started - CLI Agent Orchestrator with UI

Complete guide to install, build, and run the CLI Agent Orchestrator with its web UI.

## Prerequisites

### Required
1. **Python 3.10+**
   ```bash
   python --version
   ```

2. **tmux 3.3+**
   ```bash
   # Install tmux
   bash <(curl -s https://raw.githubusercontent.com/awslabs/cli-agent-orchestrator/refs/heads/main/tmux-install.sh)

   # Verify installation
   tmux -V
   ```

3. **uv (Python package installer)**
   ```bash
   # Install uv
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Reload shell or add to PATH
   source $HOME/.cargo/env
   ```

4. **Node.js 18+ and npm**
   ```bash
   # Check version
   node --version
   npm --version

   # If not installed, download from https://nodejs.org/
   # Or use nvm:
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   ```

5. **Claude Code or Amazon Q Developer CLI**
   - Install Claude Code: https://docs.claude.com/en/docs/claude-code
   - Or Amazon Q Developer CLI: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html

---

## Quick Start (Easiest Way)

### Option 1: Using the Startup Script (Recommended)

```bash
# 1. Navigate to project directory
cd /home/yahyashqair/anonDev/cli-agent-orchestrator

# 2. Run the startup script
./start-ui.sh
```

That's it! The script will:
- ✅ Check all dependencies
- ✅ Install UI dependencies if needed
- ✅ Start the backend server
- ✅ Start the UI development server
- ✅ Open both at the correct URLs

**URLs:**
- UI: http://localhost:3000
- Backend API: http://localhost:9889
- Health Check: http://localhost:9889/health

Press `Ctrl+C` to stop both services.

---

## Manual Setup (Step by Step)

### Step 1: Install the Backend

```bash
# Install CLI Agent Orchestrator
uv tool install git+https://github.com/awslabs/cli-agent-orchestrator.git@main --upgrade

# Or if developing locally
cd /home/yahyashqair/anonDev/cli-agent-orchestrator
uv pip install -e .

# Verify installation
cao --help
cao-server --help
```

### Step 2: Initialize the Database

```bash
# Initialize database (creates ~/.aws/cli-agent-orchestrator/)
cao init
```

### Step 3: Install Agent Profiles

```bash
# Install built-in agent profiles
cao install code_supervisor
cao install developer
cao install reviewer

# Verify installation
ls ~/.aws/cli-agent-orchestrator/agent-store/
```

### Step 4: Install UI Dependencies

```bash
# Navigate to UI directory
cd ui

# Install Node.js dependencies
npm install

# This will install:
# - React, TypeScript, Vite
# - TanStack Query, Axios
# - All other dependencies (~270 packages)
```

### Step 5: Run in Development Mode

Open **two separate terminals**:

**Terminal 1 - Backend:**
```bash
# Start the backend server
cao-server

# You should see:
# INFO:     Started server process
# INFO:     Waiting for application startup.
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:9889
```

**Terminal 2 - Frontend:**
```bash
# Navigate to UI directory
cd ui

# Start the development server
npm run dev

# You should see:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:3000/
# ➜  Network: use --host to expose
```

### Step 6: Access the UI

Open your browser and go to:
- **UI:** http://localhost:3000
- **Backend:** http://localhost:9889/health

---

## Building for Production

### Build the UI

```bash
# Navigate to UI directory
cd ui

# Build for production
npm run build

# Output will be in ui/dist/
# Build size: ~234 KB (76 KB gzipped)
```

### Preview Production Build

```bash
# In ui directory
npm run preview

# Opens at http://localhost:4173
```

### Serve Production Build

Option 1 - Using Python's HTTP server:
```bash
cd ui/dist
python -m http.server 3000
```

Option 2 - Using a static file server:
```bash
# Install serve globally
npm install -g serve

# Serve the build
cd ui
serve -s dist -p 3000
```

---

## Running Everything in Production

### Backend (Production)

```bash
# Run with production settings
cao-server

# Or with custom host/port (edit constants.py first)
# Default: 0.0.0.0:9889
```

### Frontend (Production)

Serve the built files from `ui/dist/` using any static file server:

```bash
# Option 1: Python
cd ui/dist
python -m http.server 3000

# Option 2: Node.js serve
npm install -g serve
serve -s ui/dist -p 3000

# Option 3: nginx, Apache, etc.
# Configure to serve ui/dist/ directory
```

---

## Using the Application

### 1. Launch Your First Agent

**Via UI:**
1. Click "Launch Agent" button
2. Select provider (Claude Code recommended)
3. Choose agent profile (try "developer")
4. Click "Launch Agent"

**Via CLI:**
```bash
cao launch --agents developer
```

### 2. Monitor Agents

**Via UI:**
- Dashboard shows overview statistics
- Session list shows all active sessions
- Click any terminal to view its output

**Via tmux:**
```bash
# List all sessions
tmux list-sessions

# Attach to a session
tmux attach -t cao-session-name

# Detach (while inside tmux)
Ctrl+b, then d
```

### 3. Interact with Agents

**Via UI:**
1. Click a terminal in the session list
2. Type your message in the input box
3. Click "Send"

**Via tmux:**
```bash
# Attach to the session and type directly
tmux attach -t cao-session-name
```

### 4. Clean Up

**Via UI:**
- Click trash icon next to session or terminal

**Via CLI:**
```bash
# Shutdown all sessions
cao shutdown --all

# Shutdown specific session
cao shutdown --session cao-session-name
```

---

## Development Workflow

### Backend Development

```bash
# Make changes to Python files
# Backend auto-reloads on file changes (uvicorn)

# Run tests
cd /home/yahyashqair/anonDev/cli-agent-orchestrator
pytest

# Format code
black src/
isort src/

# Type checking
mypy src/
```

### Frontend Development

```bash
# UI auto-reloads on file changes (Vite HMR)
cd ui
npm run dev

# Lint code
npm run lint

# Type checking
npm run build  # TypeScript checks during build
```

---

## Project Structure

```
cli-agent-orchestrator/
├── src/cli_agent_orchestrator/       # Python backend
│   ├── api/                          # FastAPI server
│   │   └── main.py                   # REST + WebSocket endpoints
│   ├── services/                     # Business logic
│   ├── clients/                      # tmux, database clients
│   ├── providers/                    # Q CLI, Claude Code
│   ├── models/                       # Data models
│   └── agent_store/                  # Built-in agent profiles
│
├── ui/                               # React frontend
│   ├── src/
│   │   ├── components/               # React components
│   │   ├── api/                      # API client
│   │   ├── types.ts                  # TypeScript types
│   │   └── main.tsx                  # Entry point
│   ├── dist/                         # Production build (after npm run build)
│   └── package.json                  # Dependencies
│
├── test/                             # Python tests
├── docs/                             # Documentation
├── examples/                         # Example workflows
├── start-ui.sh                       # Quick start script
└── pyproject.toml                    # Python project config
```

---

## Troubleshooting

### Backend Issues

**Problem: `cao: command not found`**
```bash
# Ensure uv tools are in PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Reinstall
uv tool install git+https://github.com/awslabs/cli-agent-orchestrator.git@main --upgrade
```

**Problem: Port 9889 already in use**
```bash
# Find process using the port
lsof -i :9889

# Kill the process
kill -9 <PID>

# Or use a different port (edit constants.py)
```

**Problem: tmux not found**
```bash
# Install tmux
sudo apt-get install tmux  # Ubuntu/Debian
brew install tmux          # macOS

# Or use the install script
bash <(curl -s https://raw.githubusercontent.com/awslabs/cli-agent-orchestrator/refs/heads/main/tmux-install.sh)
```

### Frontend Issues

**Problem: `npm: command not found`**
```bash
# Install Node.js from https://nodejs.org/
# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

**Problem: Port 3000 already in use**
```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
npm run dev -- --port 3001
```

**Problem: API requests failing (CORS errors)**
```bash
# Ensure backend is running on port 9889
curl http://localhost:9889/health

# Check Vite proxy config in ui/vite.config.ts
# Should proxy /api to http://localhost:9889
```

**Problem: Build fails**
```bash
# Clear cache and reinstall
cd ui
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Try building again
npm run build
```

### Database Issues

**Problem: Database errors**
```bash
# Reinitialize database
rm -rf ~/.aws/cli-agent-orchestrator/cao.db
cao init
```

### tmux Issues

**Problem: Can't attach to session**
```bash
# List sessions
tmux list-sessions

# Kill zombie sessions
tmux kill-session -t session-name

# Or kill all tmux sessions
tmux kill-server
```

---

## Environment Variables

### Backend
```bash
# Optional: Customize server settings
# Edit src/cli_agent_orchestrator/constants.py

SERVER_HOST = "0.0.0.0"      # Listen on all interfaces
SERVER_PORT = 9889           # Backend port
```

### Frontend
```bash
# Development proxy settings
# Edit ui/vite.config.ts

server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:9889',
    '/ws': 'ws://localhost:9889',
  },
}
```

---

## Useful Commands

### Backend
```bash
cao --help                    # Show all commands
cao init                      # Initialize database
cao launch --agents <profile> # Launch agent
cao shutdown --all            # Stop all sessions
cao flow list                 # List scheduled flows
cao-server                    # Start API server
```

### Frontend
```bash
npm install                   # Install dependencies
npm run dev                   # Development server
npm run build                 # Production build
npm run preview               # Preview production build
npm run lint                  # Lint code
```

### tmux
```bash
tmux list-sessions            # List all sessions
tmux attach -t <name>         # Attach to session
tmux kill-session -t <name>   # Kill session
tmux ls                       # Short for list-sessions
```

---

## What's Next?

1. **Explore Agent Profiles:** Check `~/.aws/cli-agent-orchestrator/agent-store/`
2. **Create Custom Agents:** See `docs/agent-profile.md`
3. **Try Examples:** Check `examples/` directory
4. **Read Documentation:** `docs/` and `ui/README.md`
5. **Understand Architecture:** `CODEBASE.md`

---

## Support

- **Issues:** https://github.com/awslabs/cli-agent-orchestrator/issues
- **Documentation:** `docs/` directory
- **Examples:** `examples/` directory
- **UI Guide:** `ui/README.md`
- **Implementation Details:** `UI_IMPLEMENTATION_SUMMARY.md`

---

## Quick Reference

### One-Command Start
```bash
./start-ui.sh
```

### Manual Start
```bash
# Terminal 1
cao-server

# Terminal 2
cd ui && npm run dev
```

### Access Points
- UI: http://localhost:3000
- API: http://localhost:9889
- Health: http://localhost:9889/health
- Docs: http://localhost:9889/docs (FastAPI auto-docs)

Happy orchestrating! 🚀
