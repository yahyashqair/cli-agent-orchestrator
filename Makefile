.PHONY: help install install-ui run-backend run-ui run-all build-ui clean test

help:
	@echo "CLI Agent Orchestrator - Makefile Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install        Install backend (CAO)"
	@echo "  make install-ui     Install UI dependencies"
	@echo "  make install-all    Install both backend and UI"
	@echo ""
	@echo "Development:"
	@echo "  make run-backend    Start backend server"
	@echo "  make run-ui         Start UI development server"
	@echo "  make run-all        Start both (requires tmux)"
	@echo "  make dev            Start everything (using start-ui.sh)"
	@echo ""
	@echo "Production:"
	@echo "  make build-ui       Build UI for production"
	@echo "  make serve-ui       Serve production UI build"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean          Clean build artifacts"
	@echo "  make clean-all      Clean everything (including node_modules)"
	@echo "  make test           Run backend tests"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install-all && make dev"

# Installation
install:
	@echo "Installing CLI Agent Orchestrator..."
	uv tool install . --upgrade
	cao init
	cao install code_supervisor
	cao install developer
	cao install reviewer

install-ui:
	@echo "Installing UI dependencies..."
	cd ui && npm install

install-all: install install-ui

# Development
run-backend:
	@echo "Starting backend server..."
	cao-server

run-ui:
	@echo "Starting UI development server..."
	cd ui && npm run dev

run-all:
	@echo "Starting both backend and UI in tmux..."
	@tmux new-session -d -s cao-dev 'cao-server'
	@tmux split-window -h -t cao-dev 'cd ui && npm run dev'
	@tmux attach -t cao-dev

dev:
	@echo "Starting everything..."
	./start-ui.sh

# Production
build-ui:
	@echo "Building UI for production..."
	cd ui && npm run build
	@echo ""
	@echo "Build complete! Files are in ui/dist/"
	@echo "Serve with: make serve-ui"

serve-ui:
	@echo "Serving production UI on http://localhost:3000..."
	cd ui/dist && python -m http.server 3000

# Maintenance
clean:
	@echo "Cleaning build artifacts..."
	rm -rf ui/dist
	rm -rf ui/node_modules/.vite
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true

clean-all: clean
	@echo "Cleaning everything..."
	rm -rf ui/node_modules
	rm -rf ui/package-lock.json

test:
	@echo "Running backend tests..."
	pytest

# Status
status:
	@echo "Checking if services are running..."
	@echo ""
	@echo "Backend (port 9889):"
	@curl -s http://localhost:9889/health && echo "✅ Running" || echo "❌ Not running"
	@echo ""
	@echo "UI (port 3000):"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Running" || echo "❌ Not running"
