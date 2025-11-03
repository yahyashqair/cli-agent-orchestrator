# Quick Start Guide

Three ways to run CLI Agent Orchestrator with UI:

## 🚀 Method 1: Automatic (Easiest)

```bash
./start-ui.sh
```

**What it does:**
- ✅ Checks dependencies
- ✅ Installs UI packages if needed
- ✅ Starts backend on port 9889
- ✅ Starts UI on port 3000
- ✅ Everything runs with one command!

**Press Ctrl+C to stop**

---

## 🛠️ Method 2: Using Makefile

```bash
# First time setup
make install-all

# Run everything
make dev
```

**Other useful commands:**
```bash
make help           # Show all commands
make run-backend    # Only backend
make run-ui         # Only UI
make build-ui       # Build for production
make clean          # Clean build files
make status         # Check if services are running
```

---

## 📝 Method 3: Manual (Full Control)

### First Time Setup

**1. Install Backend:**
```bash
# Install CAO
uv tool install . --upgrade

# Initialize database
cao init

# Install agent profiles
cao install code_supervisor
cao install developer
cao install reviewer
```

**2. Install UI:**
```bash
cd ui
npm install
```

### Running

**Terminal 1 - Backend:**
```bash
cao-server
```

**Terminal 2 - UI:**
```bash
cd ui
npm run dev
```

---

## 🌐 Access the Application

Once running, open your browser:

- **UI Dashboard:** http://localhost:3000
- **API Health Check:** http://localhost:9889/health
- **API Docs:** http://localhost:9889/docs

---

## 🎯 First Steps in the UI

1. **Click "Launch Agent"** button
2. **Select:**
   - Provider: Claude Code (recommended)
   - Agent Profile: developer
3. **Click "Launch Agent"**
4. **Watch it appear** in the session list
5. **Click the terminal** to view output
6. **Send a message:** Type in the input box and click Send

---

## 📦 Production Build

```bash
# Build UI
cd ui
npm run build

# Serve it
cd dist
python -m http.server 3000
```

Or use the Makefile:
```bash
make build-ui
make serve-ui
```

---

## ❓ Troubleshooting

### Backend won't start
```bash
# Check if port is in use
lsof -i :9889

# Kill the process
kill -9 <PID>

# Try again
cao-server
```

### UI won't start
```bash
# Check if port is in use
lsof -i :3000

# Kill the process
kill -9 <PID>

# Try again
cd ui && npm run dev
```

### Dependencies missing
```bash
# Reinstall everything
make clean-all
make install-all
```

### Can't connect to backend
```bash
# Verify backend is running
curl http://localhost:9889/health

# Should return: {"status":"ok","service":"cli-agent-orchestrator"}
```

---

## 📚 Next Steps

- **Read full guide:** [GETTING_STARTED.md](GETTING_STARTED.md)
- **UI documentation:** [ui/README.md](ui/README.md)
- **Implementation details:** [UI_IMPLEMENTATION_SUMMARY.md](UI_IMPLEMENTATION_SUMMARY.md)
- **Agent profiles:** [docs/agent-profile.md](docs/agent-profile.md)

---

## 🎉 That's It!

You now have a full-featured web UI for managing AI agent orchestration!

**The easiest way:**
```bash
./start-ui.sh
```

**Then open:** http://localhost:3000

Happy coding! 🚀
