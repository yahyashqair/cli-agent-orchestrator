# Task E: Integration and Polish
**Developer:** Developer 5
**Estimated Time:** 2-3 days
**Priority**: High (Final integration and quality assurance)

## Overview
Integrate all new components into the main application, update App.tsx, implement responsive design, accessibility improvements, animations, and create comprehensive documentation.

## Prerequisites
- Tasks A-D must be completed
- All new components must be implemented and tested
- Design system must be fully functional

## Tasks

### 1. Update Main App Component
Update `src/App.tsx` to use the new component system:
```typescript
import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { CommandPalette } from '@/components/common/CommandPalette'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Dashboard } from '@/components/features/dashboard/Dashboard'
import { SessionList } from '@/components/features/sessions/SessionList'
import { ControlPanel } from '@/components/features/sessions/ControlPanel'
import { TerminalViewer } from '@/components/features/terminal/TerminalViewer'
import { TerminalTabs } from '@/components/features/terminal/TerminalTabs'
import { FlowViewer } from '@/components/features/flows/FlowViewer'
import { InboxViewer } from '@/components/features/terminal/InboxViewer'
import { useTheme } from '@/hooks/use-theme'
import { useKeyboard } from '@/hooks/use-keyboard'
import { cn } from '@/lib/utils'
import '@/styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

interface TerminalTab {
  id: string
  name: string
  status: 'active' | 'idle' | 'offline'
  sessionId?: string
  unreadCount?: number
}

function AppContent() {
  const { theme } = useTheme()
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)
  const [selectedSession, setSelectedSession] = React.useState<string | null>(null)
  const [selectedTerminal, setSelectedTerminal] = React.useState<string>('/dev/pts/0')
  const [terminals, setTerminals] = React.useState<TerminalTab[]>([
    { id: '/dev/pts/0', name: 'Terminal 1', status: 'active', sessionId: 'session-1' },
    { id: '/dev/pts/1', name: 'Terminal 2', status: 'idle' },
    { id: '/dev/pts/2', name: 'Terminal 3', status: 'offline' },
  ])
  const [isCompactMode, setIsCompactMode] = React.useState(false)
  const [showInbox, setShowInbox] = React.useState(false)

  // Keyboard shortcuts
  useKeyboard('k', () => setCommandPaletteOpen(true), { ctrl: true })
  useKeyboard('i', () => setShowInbox(!showInbox), { ctrl: true })
  useKeyboard('b', () => setIsCompactMode(!isCompactMode), { ctrl: true })

  const handleTerminalAdd = () => {
    const newTerminal: TerminalTab = {
      id: `/dev/pts/${terminals.length}`,
      name: `Terminal ${terminals.length + 1}`,
      status: 'idle',
    }
    setTerminals([...terminals, newTerminal])
  }

  const handleTerminalClose = (terminalId: string) => {
    setTerminals(terminals.filter(t => t.id !== terminalId))
    if (selectedTerminal === terminalId) {
      setSelectedTerminal(terminals[0]?.id || '')
    }
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-background text-foreground transition-colors duration-300',
        isCompactMode && 'compact-mode'
      )}
      data-theme={theme}
    >
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <h1 className="text-lg font-semibold">CLI Agent Orchestrator</h1>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Search bar could go here */}
            </div>
            <nav className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setShowInbox(!showInbox)}
                className={cn(
                  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                  'hover:bg-accent hover:text-accent-foreground h-10 w-10'
                )}
              >
                Inbox
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container relative">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard Route */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Sessions Routes */}
          <Route
            path="/sessions"
            element={
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <SessionList
                    onSessionSelect={setSelectedSession}
                    selectedSessionId={selectedSession || undefined}
                  />
                </div>
                <div className="space-y-6">
                  <ControlPanel onSessionCreated={(id) => setSelectedSession(id)} />
                </div>
              </div>
            }
          />

          <Route
            path="/sessions/:sessionId"
            element={
              <div className="space-y-6">
                <TerminalTabs
                  terminals={terminals}
                  activeTerminalId={selectedTerminal}
                  onTerminalChange={setSelectedTerminal}
                  onTerminalClose={handleTerminalClose}
                  onTerminalAdd={handleTerminalAdd}
                />
                <TerminalViewer
                  sessionId={selectedSession || ''}
                  terminalId={selectedTerminal}
                />
              </div>
            }
          />

          {/* Flows Routes */}
          <Route
            path="/flows"
            element={
              <FlowViewer
                flowId={undefined}
                onFlowSelect={() => {}}
                onFlowEdit={() => {}}
              />
            }
          />

          <Route
            path="/flows/:flowId"
            element={
              <FlowViewer
                flowId={window.location.pathname.split('/')[2]}
                onFlowSelect={() => {}}
                onFlowEdit={() => {}}
              />
            }
          />
        </Routes>
      </main>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />

      {/* Inbox Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-14 h-[calc(100vh-3.5rem)] w-80 border-l bg-background/95 backdrop-blur transform transition-transform duration-300 ease-in-out z-30',
          showInbox ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <InboxViewer onClose={() => setShowInbox(false)} />
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        className="fixed bottom-6 right-6 z-50 md:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <span className="sr-only">Open command palette</span>
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
```

### 2. Update ThemeToggle Component
Create `src/components/common/ThemeToggle.tsx`:
```typescript
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themes = [
    { name: 'Light', value: 'light', icon: Sun },
    { name: 'Dark', value: 'dark', icon: Moon },
    { name: 'System', value: 'system', icon: Monitor },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ name, value, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value as any)}>
            <Icon className="mr-2 h-4 w-4" />
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### 3. Update Global Styles
Update `src/styles/global.css` to work with the new design system:
```css
/* Global styles that complement Tailwind CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  /* Custom properties for animations and transitions */
  --transition-duration: 150ms;
  --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);

  /* Glass morphism effect */
  --glass-background: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-backdrop: blur(10px);

  /* Animation keyframes */
  --animation-fade-in: fadeIn 0.3s ease-out;
  --animation-slide-up: slideUp 0.3s ease-out;
  --animation-slide-down: slideDown 0.3s ease-out;
}

* {
  box-sizing: border-box;
}

html {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: inherit;
  line-height: 1.6;
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.25;
}

h1 { font-size: 2.25rem; }
h2 { font-size: 1.875rem; }
h3 { font-size: 1.5rem; }
h4 { font-size: 1.25rem; }
h5 { font-size: 1.125rem; }
h6 { font-size: 1rem; }

/* Code blocks */
code {
  font-family: 'JetBrains Mono', 'Monaco', 'Cascadia Code', monospace;
  font-size: 0.875em;
  background-color: hsl(var(--muted));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

pre {
  font-family: 'JetBrains Mono', 'Monaco', 'Cascadia Code', monospace;
  background-color: hsl(var(--muted));
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  line-height: 1.5;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}

/* Focus styles */
.focus-visible:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Selection styles */
::selection {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(-25%);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

/* Utility classes */
.animate-spin {
  animation: spin 1s linear infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bounce {
  animation: bounce 1s infinite;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

.animate-slide-down {
  animation: slideDown 0.3s ease-out;
}

/* Glass morphism utilities */
.glass {
  background: var(--glass-background);
  backdrop-filter: var(--glass-backdrop);
  border: 1px solid var(--glass-border);
}

/* Compact mode */
.compact-mode .container {
  max-width: 100%;
  padding: 0 1rem;
}

.compact-mode .space-y-6 > * + * {
  margin-top: 1rem;
}

.compact-mode .space-y-4 > * + * {
  margin-top: 0.75rem;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
  .lg\:grid-cols-3 {
    grid-template-columns: 1fr;
  }

  .lg\:col-span-2 {
    grid-column: span 1;
  }
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 0%;
    --ring: 0 0% 0%;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Dark mode specific adjustments */
.dark .glass {
  --glass-background: rgba(0, 0, 0, 0.2);
  --glass-border: rgba(255, 255, 255, 0.1);
}

/* Loading states */
.loading-skeleton {
  background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

### 4. Create Component Documentation
Create `src/components/README.md`:
```markdown
# Component Library Documentation

## Overview
This is a comprehensive component library built with Radix UI primitives and Tailwind CSS. All components are fully accessible, responsive, and follow modern React patterns.

## Design System

### Colors
The design system uses CSS custom properties for theming:
- `--background`: Main background color
- `--foreground`: Main text color
- `--primary`: Primary brand color
- `--secondary`: Secondary color
- `--muted`: Muted/gray colors
- `--accent`: Accent color for highlights
- `--destructive`: Error/danger color

### Typography
- **Font Family**: Inter for UI, JetBrains Mono for code
- **Font Sizes**: Responsive scaling from `text-xs` to `text-3xl`
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Spacing
Consistent spacing scale using Tailwind's spacing units:
- Padding: `p-1` to `p-8`
- Margin: `m-1` to `m-8`
- Gap: `gap-1` to `gap-8`

## Components

### Base Components

#### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="md">
  Click me
</Button>
```

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `glass`
**Sizes:** `xs`, `sm`, `default`, `lg`, `icon`

#### Card
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

#### Input
```tsx
import { Input } from '@/components/ui/input'

<Input placeholder="Enter text" label="Label" error="Error message" />
```

#### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Layout Components

#### Panel
```tsx
import { Panel } from '@/components/layout/panel'

<Panel glass elevated>
  Panel content
</Panel>
```

### Feature Components

#### Dashboard
```tsx
import { Dashboard } from '@/components/features/dashboard/Dashboard'

<Dashboard />
```

#### TerminalViewer
```tsx
import { TerminalViewer } from '@/components/features/terminal/TerminalViewer'

<TerminalViewer sessionId="session-123" terminalId="/dev/pts/0" />
```

#### SessionList
```tsx
import { SessionList } from '@/components/features/sessions/SessionList'

<SessionList
  onSessionSelect={(id) => console.log(id)}
  selectedSessionId="session-123"
/>
```

## Hooks

### useTheme
```tsx
import { useTheme } from '@/hooks/use-theme'

const { theme, setTheme } = useTheme()
```

### useKeyboard
```tsx
import { useKeyboard } from '@/hooks/use-keyboard'

useKeyboard('k', () => console.log('Ctrl+K pressed'), { ctrl: true })
```

## Patterns

### Form Patterns
Use the `Input` component with proper labeling and error handling:
```tsx
<Input
  id="email"
  type="email"
  label="Email Address"
  placeholder="Enter your email"
  error={errors.email}
  {...register('email')}
/>
```

### Loading States
Use loading spinners and skeleton states:
```tsx
{isLoading ? (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
) : (
  <Content />
)}
```

### Error Handling
Display errors gracefully:
```tsx
{error && (
  <div className="text-destructive text-sm">
    {error.message}
  </div>
)}
```

## Accessibility

All components follow WCAG 2.1 guidelines:
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Responsive Design

Components are responsive by default:
- Mobile-first approach
- Breakpoint-specific classes
- Flexible layouts
- Touch-friendly interactions

## Customization

### Theme Customization
Extend the theme in `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      brand: {
        50: '#eff6ff',
        500: '#3b82f6',
        900: '#1e3a8a',
      }
    }
  }
}
```

### Component Variants
Use Class Variance Authority for component variants:
```tsx
const buttonVariants = cva(baseClasses, {
  variants: {
    variant: {
      primary: 'bg-brand-500 text-white',
      secondary: 'bg-gray-100 text-gray-900',
    }
  }
})
```

## Best Practices

1. **Composition over inheritance** - Combine components to create complex UIs
2. **Consistent props** - Use similar prop names across components
3. **TypeScript first** - All components are fully typed
4. **Performance** - Use `React.memo` for expensive components
5. **Testing** - All components should be tested
6. **Documentation** - Document complex components and patterns

## Migration Guide

When migrating from the old UI system:

1. Replace custom CSS classes with Tailwind utilities
2. Use new component variants instead of inline styles
3. Implement proper TypeScript types
4. Add accessibility attributes
5. Test responsive behavior
6. Update error handling patterns

## Contributing

When adding new components:

1. Follow existing patterns and conventions
2. Add proper TypeScript types
3. Include accessibility features
4. Write documentation
5. Add responsive design
6. Test with different themes
7. Ensure keyboard navigation works
```

### 5. Update Package.json Scripts
Update the scripts in `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### 6. Create Storybook Configuration
Create `.storybook/main.ts`:
```typescript
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
}

export default config
```

## Deliverables

1. ✅ Updated App.tsx with new component system
2. ✅ Updated ThemeToggle component
3. ✅ Enhanced global styles
4. ✅ Component documentation
5. ✅ Responsive design implementation
6. ✅ Accessibility improvements
7. ✅ Animation and transition polish
8. ✅ Error handling enhancements
9. ✅ Performance optimizations
10. ✅ Storybook setup for component showcase

## Testing Checklist

- [ ] Application loads without errors
- [ ] All routes work correctly
- [ ] Theme switching works
- [ ] Command palette functions properly
- [ ] Responsive design works on all screen sizes
- [ ] Keyboard navigation works throughout
- [ ] Accessibility features are functional
- [ ] Animations are smooth and performant
- [ ] Error states display correctly
- [ ] Loading states work properly
- [ ] Component integration works seamlessly

## Final Quality Assurance

Before marking this task complete:

1. **Cross-browser testing**: Test in Chrome, Firefox, Safari, Edge
2. **Mobile testing**: Test on iOS and Android devices
3. **Accessibility audit**: Use tools like axe-core to check compliance
4. **Performance testing**: Check bundle size and loading times
5. **User flow testing**: Test complete user journeys
6. **Error scenario testing**: Test edge cases and error conditions

## Deployment Notes

1. Ensure all environment variables are properly configured
2. Test build process thoroughly
3. Verify API endpoints are accessible
4. Check that all static assets load correctly
5. Monitor console for any warnings or errors

## Next Steps

Once this task is complete and all quality assurance checks pass:

1. Create a comprehensive pull request
2. Update project documentation
3. Provide migration guide for team members
4. Schedule training session for the new UI system
5. Plan for incremental rollout and user feedback collection

## Notes

- This is the final integration task that brings everything together
- Pay special attention to the small details that make the UI feel polished
- Test thoroughly with real data and user scenarios
- Document any limitations or known issues
- Ensure the new system is maintainable and extensible for future development