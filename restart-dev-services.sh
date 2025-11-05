#!/usr/bin/env bash

# Restart the CAO backend (FastAPI) and frontend (Vite) dev services.
# If either service is already running, terminate it before relaunching.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$REPO_ROOT/.logs"

mkdir -p "$LOG_DIR"

BACKEND_LABEL="cao backend"
FRONTEND_LABEL="cao frontend"
BACKEND_CMD_PATTERN="uv run cao-server"
FRONTEND_CMD_PATTERN="npm --prefix ui run dev"

stop_service() {
    local label="$1"
    local pattern="$2"
    local pids=""

    if pids=$(pgrep -f "$pattern"); then
        echo "Stopping $label (PID(s): $pids)"
        kill $pids >/dev/null 2>&1 || true

        for _ in {1..5}; do
            if ! pgrep -f "$pattern" >/dev/null 2>&1; then
                echo "$label stopped."
                return 0
            fi
            sleep 1
        done

        echo "$label did not exit in time; sending SIGKILL."
        kill -9 $pids >/dev/null 2>&1 || true
    else
        echo "$label is not running."
    fi
}

start_backend() {
    echo "Starting $BACKEND_LABEL..."
    nohup uv run cao-server \
        >> "$LOG_DIR/cao-server.log" 2>&1 &
    local pid=$!
    echo "$BACKEND_LABEL started (PID: $pid)"
    echo $pid > "$LOG_DIR/cao-server.pid"
}

start_frontend() {
    echo "Starting $FRONTEND_LABEL..."
    nohup npm --prefix "$REPO_ROOT/ui" run dev -- --host 127.0.0.1 --port 3000 \
        >> "$LOG_DIR/ui-dev.log" 2>&1 &
    local pid=$!
    echo "$FRONTEND_LABEL started (PID: $pid)"
    echo $pid > "$LOG_DIR/ui-dev.pid"
}

require_commands() {
    local missing=0
    for cmd in "$@"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            echo "Missing required command: $cmd" >&2
            missing=1
        fi
    done

    if [[ $missing -eq 1 ]]; then
        exit 1
    fi
}

require_commands uv npm pgrep kill nohup

stop_service "$BACKEND_LABEL" "$BACKEND_CMD_PATTERN"
stop_service "$FRONTEND_LABEL" "$FRONTEND_CMD_PATTERN"

start_backend
start_frontend

echo ""
echo "Backend logs:  $LOG_DIR/cao-server.log"
echo "Frontend logs: $LOG_DIR/ui-dev.log"
echo "UI:            http://127.0.0.1:3000/"
echo "API:           http://127.0.0.1:9889/"
