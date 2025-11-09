import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Terminal,
  GitBranch,
  MessageSquare,
  Settings,
  Archive,
  Activity,
  Users,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { CommandPalette } from './CommandPalette';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Overview and quick stats',
  },
  {
    name: 'Sessions',
    href: '/sessions',
    icon: Terminal,
    description: 'Manage terminal sessions',
  },
  {
    name: 'Agents',
    href: '/agents',
    icon: Users,
    description: 'Configure AI agents',
  },
  {
    name: 'Flows',
    href: '/flows',
    icon: GitBranch,
    description: 'Automated workflows',
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    description: 'Inter-terminal communication',
  },
  {
    name: 'Activity',
    href: '/activity',
    icon: Activity,
    description: 'System activity log',
  },
  {
    name: 'Archive',
    href: '/archive',
    icon: Archive,
    description: 'Historical data',
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col bg-card border-r border-border transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">CAO</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.name === 'Messages' && (
                      <Badge variant="secondary" size="sm" className="ml-auto">
                        3
                      </Badge>
                    )}
                  </>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded-md text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                    {item.description && (
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full justify-start"
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Actions
              <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </Button>
          </div>
        )}

        {/* Settings */}
        <div className="p-4 border-t border-border">
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              location.pathname === '/settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <Settings className="w-4 h-4" />
            {!isCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
      />
    </>
  );
}