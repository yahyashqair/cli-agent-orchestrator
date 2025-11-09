import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Search
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

export function Header() {
  const [connectionStatus, setConnectionStatus] = React.useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastConnected, setLastConnected] = React.useState<Date | null>(null);

  // WebSocket connection status
  React.useEffect(() => {
    const checkConnection = () => {
      const status = wsManager.getConnectionState();
      setConnectionStatus(status === 'open' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected');

      if (status === 'open') {
        setLastConnected(new Date());
      }
    };

    checkConnection();

    const unsubscribe = wsManager.subscribe('connection_status', () => {
      checkConnection();
    });

    return unsubscribe;
  }, []);

  // Fetch pending messages count
  const { data: pendingMessages } = useQuery({
    queryKey: ['pending-messages'],
    queryFn: () => endpoints.messages.getPendingCount().then(res => res.data),
    refetchInterval: 10000,
  });

  const handleReconnect = async () => {
    try {
      await wsManager.connect();
      toast({
        title: "Reconnected",
        description: "WebSocket connection restored",
      });
    } catch (error) {
      toast({
        title: "Reconnection failed",
        description: "Unable to establish WebSocket connection",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      {/* Left side - Page Title/Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            New Session
          </Button>
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Right side - Status and Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <Button variant="ghost" size="sm">
          <Search className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {pendingMessages?.count > 0 && (
            <Badge
              variant="destructive"
              size="sm"
              className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs flex items-center justify-center"
            >
              {pendingMessages.count > 99 ? '99+' : pendingMessages.count}
            </Badge>
          )}
        </Button>

        {/* Connection Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted/50">
          {connectionStatus === 'connected' ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Connected</span>
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
              <span className="text-xs text-yellow-600 font-medium">Connecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-600 font-medium">Disconnected</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleReconnect}
                className="h-4 w-4 p-0 ml-1"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>

        {/* Last connected timestamp */}
        {lastConnected && (
          <div className="text-xs text-muted-foreground">
            Last connected: {formatRelativeTime(lastConnected)}
          </div>
        )}
      </div>
    </header>
  );
}