#!/bin/bash

# CLI Agent Orchestrator - UI Startup Script
# This script starts both the backend server and the UI development server

set -e

echo "🚀 Starting CLI Agent Orchestrator UI..."
echo ""

# Check if cao-server is available
if ! command -v cao-server &> /dev/null; then
    echo "❌ Error: cao-server not found. Please install CLI Agent Orchestrator first."
    echo "   Run: uv tool install git+https://github.com/awslabs/cli-agent-orchestrator.git@main"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "ui/node_modules" ]; then
    echo "📦 Installing UI dependencies..."
    cd ui
    npm install
    cd ..
    echo ""
fi

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server in background
echo "🔧 Starting backend server on http://localhost:9889..."
cao-server &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo ""

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:9889/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start within 30 seconds"
        cleanup
    fi
    sleep 1
done
echo ""

# Start frontend development server
echo "🎨 Starting UI development server on http://localhost:3000..."
cd ui
npm run dev &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"
echo ""

echo "✨ CLI Agent Orchestrator UI is running!"
echo ""
echo "📍 URLs:"
echo "   UI:      http://localhost:3000"
echo "   Backend: http://localhost:9889"
echo "   Health:  http://localhost:9889/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait
