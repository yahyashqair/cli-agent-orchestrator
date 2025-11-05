# Running the Backend and Frontend Locally

Use this checklist whenever you need to spin up the CLI Agent Orchestrator backend (FastAPI) and the web UI (Vite + React).

## Prerequisites
- Python dependencies: `uv sync`
- Frontend dependencies: `cd ui && npm install`

## Start the Backend (FastAPI)
1. From the repository root run:
   ```bash
   uv run cao-server
   ```
2. Optional: set `CAO_SERVER_HOST=0.0.0.0` if you need to reach the API from outside the machine.
3. Verify it is healthy:
   ```bash
   curl http://127.0.0.1:9889/health
   ```
   You should see `{"status":"ok","service":"cli-agent-orchestrator"}`.

## Start the Frontend (Vite Dev Server)
1. In a new terminal from the repo root:
   ```bash
   cd ui
   npm run dev -- --host 127.0.0.1 --port 3000
   ```
2. Browse to `http://127.0.0.1:3000/`.

## Stopping the Servers
- Press `Ctrl+C` in the terminals that are running the backend or frontend.
- Alternatively, find the process IDs via `ps -fp <pid>` and stop them with `kill <pid>`.

## Tips
- Backend logs are printed to the terminal and can also be found under `~/.aws/cli-agent-orchestrator/logs/`.
- The Vite dev server proxies `/api` and `/ws` to `http://localhost:9889`, so ensure the backend is running first to avoid proxy errors.
