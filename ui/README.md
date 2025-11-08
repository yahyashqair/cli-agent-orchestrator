# CLI Agent Orchestrator - Web UI

A modern, real-time web interface for monitoring and controlling CLI Agent Orchestrator sessions and agents.

## Features

- **Real-time Dashboard**: Overview of all sessions, agents, and their current status
- **Terminal Viewer**: View terminal output in real-time with auto-scroll
- **Agent Control**: Send input to agents, launch new agents, and manage sessions
- **Activity Summary**: Visual breakdown of agent statuses and activity
- **Session Management**: Organize agents by sessions with expand/collapse views
- **Responsive Design**: Dark-themed, modern UI optimized for development workflows
- **Agent Provider Overrides**: Configure default providers per agent profile

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TanStack Query** (React Query) for data fetching and caching
- **Axios** for API communication
- **Lucide React** for icons
- **CSS Modules** for styling

### Key Components

1. **Dashboard**: Shows overview statistics and status breakdown
2. **SessionList**: Displays sessions and terminals in a tree structure
3. **TerminalViewer**: Real-time terminal output with input controls
4. **ControlPanel**: Form for launching new agent sessions

### Data Flow

```
UI Components
    ↓ (TanStack Query)
API Client (Axios)
    ↓ (HTTP/REST)
FastAPI Backend (:9889)
    ↓
Terminal Services
    ↓
tmux Sessions
```

### Real-time Updates

- **Polling**: TanStack Query auto-refreshes every 2 seconds
- **WebSocket**: `/ws` endpoint available for future real-time push updates
- **Auto-scroll**: Terminal output automatically scrolls to latest content

## Setup

### Prerequisites
- Node.js 18+ and npm
- Python backend running on `http://localhost:9889`

### Installation

```bash
cd ui
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The UI will be available at `http://localhost:3000` with hot-reload enabled.

The Vite dev server proxies API requests to the backend:
- `/api/*` → `http://localhost:9889/*`
- `/ws` → `ws://localhost:9889/ws` (WebSocket)

### Build for Production

```bash
npm run build
```

Builds are output to `ui/dist/` and can be served by any static file server.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Launching Agents

1. Click "Launch Agent" button in the header
2. Select provider (Claude Code or Q CLI)
3. Choose agent profile (supervisor, developer, reviewer)
4. Optionally name the session
5. Click "Launch Agent"

### Configuring Agent Providers

1. Click **Agent Providers** in the header to open the settings panel
2. Pick a default provider for each agent profile (Code Supervisor, Developer, Reviewer)
3. Click **Save** to persist the override or **Reset** to return to Amazon Q (`q_cli`)
4. Saved overrides are automatically applied in the Control Panel, and profiles without overrides fall back to their default (Amazon Q) so you never carry over the wrong provider. You can still override the selection for a single launch.

### Monitoring Agents

- **Dashboard**: View total sessions, agents, and status breakdown
- **Session List**: Expand sessions to see all terminals
- **Terminal Selection**: Click any terminal to view its output

### Controlling Terminals

- **Send Input**: Type in the input box and click "Send"
- **Auto-scroll**: Toggle to automatically scroll to latest output
- **Refresh**: Manually refresh terminal output
- **Exit**: Send provider-specific exit command
- **Delete**: Remove terminal from session

### Managing Sessions

- **Delete Session**: Click trash icon next to session name
- **Delete Terminal**: Click trash icon next to terminal in list

## API Integration

The UI communicates with the backend via:

### REST Endpoints

- `GET /health` - Health check
- `GET /sessions` - List all sessions
- `POST /sessions` - Create new session with terminal
- `GET /sessions/{name}` - Get session details
- `DELETE /sessions/{name}` - Delete session
- `GET /terminals/{id}` - Get terminal details
- `POST /terminals/{id}/input` - Send input to terminal
- `GET /terminals/{id}/output` - Get terminal output
- `POST /terminals/{id}/exit` - Send exit command
- `DELETE /terminals/{id}` - Delete terminal
- `GET /agent-provider-configs` - List agent provider overrides
- `PUT /agent-provider-configs/{agent_profile}` - Save/update an override
- `DELETE /agent-provider-configs/{agent_profile}` - Remove an override

### WebSocket Endpoint

- `WS /ws` - Real-time updates (available for future enhancements)

## Customization

### Styling

All styles use CSS custom properties defined in `src/styles/global.css`:

```css
--bg-primary: #0f172a
--bg-secondary: #1e293b
--accent: #3b82f6
--success: #10b981
--error: #ef4444
```

Modify these to customize the color scheme.

### Refresh Intervals

Adjust polling intervals in `src/main.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 2000, // milliseconds
    },
  },
})
```

### Terminal Output Buffer

Terminal output is fetched with `mode=full` by default. To limit output:

```typescript
api.getOutput(terminalId, 'last') // Only last chunk
```

## Development Notes

### File Structure

```
ui/
├── src/
│   ├── api/
│   │   └── client.ts          # API client functions
│   ├── components/
│   │   ├── AgentProviderSettings.tsx # Provider settings modal
│   │   ├── Dashboard.tsx      # Overview stats
│   │   ├── SessionList.tsx    # Session tree view
│   │   ├── TerminalViewer.tsx # Terminal output viewer
│   │   └── ControlPanel.tsx   # Launch agent form
│   ├── constants/
│   │   └── providers.ts       # Provider + agent profile metadata
│   ├── styles/
│   │   └── global.css         # Global styles and theme
│   ├── types.ts               # TypeScript types
│   ├── App.tsx                # Main app component
│   └── main.tsx               # Entry point
├── public/                    # Static assets
├── index.html                 # HTML template
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── vite.config.ts             # Vite config
```

### TypeScript Types

All types are defined in `src/types.ts` to match the backend models:

- `Terminal` - Terminal/agent instance
- `Session` - tmux session with terminals
- `TerminalStatus` - Agent status enum
- `TerminalOutput` - Terminal output response

### State Management

Uses TanStack Query for server state:
- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Error handling

No global state management needed - all state is server-driven.

## Troubleshooting

### Backend Connection Issues

- Ensure backend is running: `cao-server`
- Check backend is on port 9889: `curl http://localhost:9889/health`
- Verify CORS is enabled in backend

### Terminal Not Updating

- Check auto-refresh interval (default: 1-2 seconds)
- Verify terminal is IDLE or PROCESSING
- Check browser console for API errors

### Build Errors

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Update dependencies: `npm update`

## Future Enhancements

- [ ] WebSocket-based real-time updates (polling → push)
- [ ] Terminal history and log export
- [ ] Inbox message visualization
- [ ] Flow scheduling UI
- [ ] Agent profile editor
- [ ] Multi-session parallel operations
- [ ] Terminal output search and filtering
- [ ] Dark/light theme toggle
- [ ] Agent performance metrics
- [ ] Custom agent profile upload
