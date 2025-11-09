import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Terminal,
  GitBranch,
  MessageSquare,
  Users,
  Activity,
  Archive,
  Settings,
  Plus,
  Search,
  FileText,
  Trash2,
  RefreshCw,
  Play,
  Pause,
  Square,
  Copy,
  Download,
  Upload,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const commandGroups = [
  {
    heading: 'Navigation',
    commands: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        shortcut: ['g', 'd'],
        action: (navigate: any) => navigate('/'),
      },
      {
        id: 'sessions',
        label: 'Sessions',
        icon: Terminal,
        shortcut: ['g', 's'],
        action: (navigate: any) => navigate('/sessions'),
      },
      {
        id: 'agents',
        label: 'Agents',
        icon: Users,
        shortcut: ['g', 'a'],
        action: (navigate: any) => navigate('/agents'),
      },
      {
        id: 'flows',
        label: 'Flows',
        icon: GitBranch,
        shortcut: ['g', 'f'],
        action: (navigate: any) => navigate('/flows'),
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: MessageSquare,
        shortcut: ['g', 'm'],
        action: (navigate: any) => navigate('/messages'),
      },
      {
        id: 'activity',
        label: 'Activity',
        icon: Activity,
        shortcut: ['g', 'l'],
        action: (navigate: any) => navigate('/activity'),
      },
      {
        id: 'archive',
        label: 'Archive',
        icon: Archive,
        shortcut: ['g', 'r'],
        action: (navigate: any) => navigate('/archive'),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        shortcut: ['g', ','],
        action: (navigate: any) => navigate('/settings'),
      },
    ],
  },
  {
    heading: 'Quick Actions',
    commands: [
      {
        id: 'new-session',
        label: 'Create New Session',
        icon: Plus,
        shortcut: ['c', 's'],
        action: (navigate: any) => {
          // Open new session dialog
          console.log('Create new session');
        },
      },
      {
        id: 'new-terminal',
        label: 'Create New Terminal',
        icon: Terminal,
        shortcut: ['c', 't'],
        action: (navigate: any) => {
          console.log('Create new terminal');
        },
      },
      {
        id: 'new-flow',
        label: 'Create New Flow',
        icon: Plus,
        shortcut: ['c', 'f'],
        action: (navigate: any) => {
          console.log('Create new flow');
        },
      },
      {
        id: 'search',
        label: 'Search...',
        icon: Search,
        shortcut: ['/',],
        action: (navigate: any) => {
          console.log('Global search');
        },
      },
    ],
  },
  {
    heading: 'Session Actions',
    commands: [
      {
        id: 'start-all',
        label: 'Start All Sessions',
        icon: Play,
        action: (navigate: any) => console.log('Start all sessions'),
      },
      {
        id: 'pause-all',
        label: 'Pause All Sessions',
        icon: Pause,
        action: (navigate: any) => console.log('Pause all sessions'),
      },
      {
        id: 'stop-all',
        label: 'Stop All Sessions',
        icon: Square,
        action: (navigate: any) => console.log('Stop all sessions'),
      },
      {
        id: 'refresh-all',
        label: 'Refresh All',
        icon: RefreshCw,
        shortcut: ['r', 'r'],
        action: (navigate: any) => console.log('Refresh all'),
      },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleCommandSelect = useCallback((command: any) => {
    command.action(navigate);
    onOpenChange(false);
    setSearch('');
  }, [navigate, onOpenChange]);

  const filteredCommands = React.useMemo(() => {
    if (!search) return commandGroups;

    const lowerSearch = search.toLowerCase();
    return commandGroups.map(group => ({
      ...group,
      commands: group.commands.filter(command =>
        command.label.toLowerCase().includes(lowerSearch) ||
        command.id.toLowerCase().includes(lowerSearch)
      ),
    })).filter(group => group.commands.length > 0);
  }, [search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[450px] overflow-y-auto p-2">
            {!search && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                Quick Actions
              </div>
            )}

            {filteredCommands.map((group, groupIndex) => (
              <Command.Group key={group.heading} heading={search ? '' : group.heading}>
                {group.commands.map((command) => {
                  const Icon = command.icon;
                  return (
                    <Command.Item
                      key={command.id}
                      onSelect={() => handleCommandSelect(command)}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground",
                        "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span className="flex-1">{command.label}</span>
                      {command.shortcut && (
                        <div className="ml-auto flex items-center gap-1">
                          {command.shortcut.map((key, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="min-w-[20px] h-5 px-1 text-xs flex items-center justify-center"
                            >
                              {key}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Command.Item>
                  );
                })}
                {groupIndex < filteredCommands.length - 1 && <Command.Separator className="my-2" />}
              </Command.Group>
            ))}

            {search && filteredCommands.every(group => group.commands.length === 0) && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}