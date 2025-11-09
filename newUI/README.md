# CLI Agent Orchestrator - New UI

A modern, responsive React application for managing AI agent CLI workflows and orchestrating terminal sessions.

## Features

### 🎨 Modern UI/UX Design
- **Activity-Based Layout**: Organized around user workflows
- **Progressive Disclosure**: Relevant information based on context
- **Glass Morphism Effects**: Modern visual design with backdrop filters
- **Dark/Light Themes**: Comprehensive theming system
- **Responsive Design**: Mobile-first approach

### ⚡ Performance Optimizations
- **Connection Pooling**: Optimized API requests with deduplication
- **Lazy Loading**: Components loaded on demand
- **Virtualization**: Efficient rendering of large lists
- **Smart Polling**: Adaptive refresh based on user activity
- **Error Boundaries**: Graceful error handling throughout

### 🔧 Advanced Features
- **Command Palette**: Keyboard-first navigation (⌘K)
- **Real-time Updates**: WebSocket integration for live data
- **Quick Actions**: Contextual shortcuts and bulk operations
- **Search & Discovery**: Global search across all resources
- **Accessibility**: Full ARIA compliance and keyboard navigation

### 🏗️ Architecture
- **TypeScript**: Full type safety throughout
- **React 18**: Modern hooks and concurrent features
- **Tailwind CSS**: Utility-first styling with custom components
- **Radix UI**: Accessible component primitives
- **React Query**: Sophisticated data fetching with caching
- **Zustand**: Lightweight state management

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to the new UI directory
cd newUI

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3001`

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI primitives (Button, Card, etc.)
│   ├── layout/         # Layout components (Sidebar, Header, etc.)
│   └── features/       # Feature-specific components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
├── store/              # State management
└── styles/             # Global styles and CSS
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Key Features

### Dashboard
- **Overview Stats**: Active sessions, flows, messages
- **Quick Actions**: Create sessions, flows, agents
- **Recent Activity**: Timeline of system events
- **Real-time Updates**: Live data via WebSocket

### Session Management
- **Multi-terminal Support**: Manage multiple terminals per session
- **Provider Selection**: Choose AI provider per terminal
- **Status Tracking**: Real-time terminal status
- **Bulk Operations**: Start, stop, archive multiple sessions

### Agent Configuration
- **Provider Management**: Configure providers for each agent
- **Profile System**: Create and manage agent profiles
- **Status Monitoring**: Track agent availability and health

### Flow Automation
- **Visual Interface**: Create and manage automated workflows
- **Scheduling**: Cron-based scheduling
- **Execution History**: Track flow runs and results
- **Agent Assignment**: Specify which agent handles each flow

### Real-time Communication
- **Inter-terminal Messaging**: Send messages between terminals
- **Notification System**: Real-time notifications for important events
- **WebSocket Integration**: Live updates without polling

## Development Guidelines

### Component Development
- Use TypeScript for all components
- Follow the established component patterns
- Implement proper error boundaries
- Ensure accessibility (ARIA labels, keyboard navigation)
- Add loading states and error handling

### State Management
- Use React Query for server state
- Use Zustand for complex client state
- Keep component state local when possible
- Implement optimistic updates for better UX

### Styling
- Use Tailwind utility classes
- Follow the design system tokens
- Implement responsive design
- Ensure proper contrast ratios for accessibility

## API Integration

The UI integrates with the CLI Agent Orchestrator backend API:

- **Base URL**: `http://127.0.0.1:9889` (proxied via `/api`)
- **WebSocket**: `ws://127.0.0.1:9889/ws` (proxied via `/ws`)

### Key Endpoints
- `/sessions` - Session management
- `/terminals` - Terminal operations
- `/flows` - Flow automation
- `/messages` - Inter-terminal communication
- `/agent-provider-configs` - Agent configuration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the established code patterns
2. Ensure type safety with TypeScript
3. Test thoroughly before submitting
4. Update documentation for new features
5. Maintain accessibility standards