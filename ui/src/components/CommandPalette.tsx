import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  ChevronLeft,
  ChevronRight,
  Layers,
  Zap,
  Settings,
  Plus
} from 'lucide-react'
import './CommandPalette.css'

interface Command {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter commands based on search query
  const filteredCommands = commands.filter(cmd => {
    const query = searchQuery.toLowerCase()
    return (
      cmd.label.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query) ||
      cmd.keywords?.some(kw => kw.toLowerCase().includes(query))
    )
  })

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-header">
          <Search size={18} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="command-palette-kbd">Esc</kbd>
        </div>

        <div className="command-palette-list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">
              No commands found for "{searchQuery}"
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command-palette-item ${index === selectedIndex ? 'command-palette-item-selected' : ''}`}
                onClick={() => {
                  cmd.action()
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-palette-item-icon">{cmd.icon}</div>
                <div className="command-palette-item-content">
                  <div className="command-palette-item-label">{cmd.label}</div>
                  <div className="command-palette-item-description">{cmd.description}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <div className="command-palette-hint">
            <kbd>↑</kbd> <kbd>↓</kbd> Navigate
          </div>
          <div className="command-palette-hint">
            <kbd>↵</kbd> Select
          </div>
          <div className="command-palette-hint">
            <kbd>Esc</kbd> Close
          </div>
        </div>
      </div>
    </div>
  )
}

export function useCommandPalette(
  isFullscreen: boolean,
  compactMode: boolean,
  leftPanelCollapsed: boolean,
  rightPanelCollapsed: boolean,
  onToggleFullscreen: () => void,
  onToggleCompactMode: () => void,
  onToggleLeftPanel: () => void,
  onToggleRightPanel: () => void,
  onLaunchAgent: () => void,
  onOpenProviderSettings: () => void,
  onSwitchToFlows: () => void,
  onSwitchToSessions: () => void
): Command[] {
  return [
    {
      id: 'toggle-fullscreen',
      label: isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
      description: isFullscreen ? 'Exit fullscreen terminal view' : 'View terminal in fullscreen',
      icon: isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />,
      action: onToggleFullscreen,
      keywords: ['fullscreen', 'maximize', 'minimize', 'view']
    },
    {
      id: 'toggle-compact',
      label: compactMode ? 'Disable Compact Mode' : 'Enable Compact Mode',
      description: compactMode ? 'Use normal spacing' : 'Reduce padding for more space',
      icon: <Layers size={16} />,
      action: onToggleCompactMode,
      keywords: ['compact', 'spacing', 'padding', 'dense']
    },
    {
      id: 'toggle-left-panel',
      label: leftPanelCollapsed ? 'Expand Left Panel' : 'Collapse Left Panel',
      description: leftPanelCollapsed ? 'Show dashboard and statistics' : 'Hide dashboard and statistics',
      icon: leftPanelCollapsed ? <ChevronRight size={16} /> : <PanelLeftClose size={16} />,
      action: onToggleLeftPanel,
      keywords: ['panel', 'sidebar', 'dashboard', 'collapse', 'expand']
    },
    {
      id: 'toggle-right-panel',
      label: rightPanelCollapsed ? 'Expand Right Panel' : 'Collapse Right Panel',
      description: rightPanelCollapsed ? 'Show sessions list' : 'Hide sessions list',
      icon: rightPanelCollapsed ? <ChevronLeft size={16} /> : <PanelRightClose size={16} />,
      action: onToggleRightPanel,
      keywords: ['panel', 'sessions', 'collapse', 'expand']
    },
    {
      id: 'launch-agent',
      label: 'Launch Agent',
      description: 'Open control panel to launch a new agent',
      icon: <Plus size={16} />,
      action: onLaunchAgent,
      keywords: ['launch', 'new', 'agent', 'terminal', 'create', 'start']
    },
    {
      id: 'provider-settings',
      label: 'Agent Provider Settings',
      description: 'Configure agent providers',
      icon: <Settings size={16} />,
      action: onOpenProviderSettings,
      keywords: ['settings', 'provider', 'configure', 'config']
    },
    {
      id: 'switch-to-sessions',
      label: 'View Sessions',
      description: 'Switch to sessions view',
      icon: <TerminalIcon size={16} />,
      action: onSwitchToSessions,
      keywords: ['sessions', 'terminals', 'view']
    },
    {
      id: 'switch-to-flows',
      label: 'View Flows',
      description: 'Switch to flows view',
      icon: <Zap size={16} />,
      action: onSwitchToFlows,
      keywords: ['flows', 'automation', 'view']
    }
  ]
}
