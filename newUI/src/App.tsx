import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { SessionsPage } from '@/pages/SessionsPage';
import { wsManager } from '@/lib/websocket';
import { useToast } from '@/components/ui/use-toast';

// Lazy load pages for better performance
const AgentsPage = React.lazy(() => import('@/pages/AgentsPage').then(module => ({
  default: module.AgentsPage
})));
const FlowsPage = React.lazy(() => import('@/pages/FlowsPage').then(module => ({
  default: module.FlowsPage
})));
const MessagesPage = React.lazy(() => import('@/pages/MessagesPage').then(module => ({
  default: module.MessagesPage
})));
const ActivityPage = React.lazy(() => import('@/pages/ActivityPage').then(module => ({
  default: module.ActivityPage
})));
const ArchivePage = React.lazy(() => import('@/pages/ArchivePage').then(module => ({
  default: module.ArchivePage
})));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage').then(module => ({
  default: module.SettingsPage
})));

function App() {
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await wsManager.connect();
        toast({
          title: "Connected",
          description: "Real-time updates are now active",
        });
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        toast({
          title: "Connection Failed",
          description: "Unable to establish real-time connection. Some features may be limited.",
          variant: "destructive",
        });
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      wsManager.disconnect();
    };
  }, [toast]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:sessionId" element={<div>Session Details (TODO)</div>} />
        <Route
          path="agents"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <AgentsPage />
            </React.Suspense>
          }
        />
        <Route
          path="flows"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <FlowsPage />
            </React.Suspense>
          }
        />
        <Route
          path="messages"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <MessagesPage />
            </React.Suspense>
          }
        />
        <Route
          path="activity"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ActivityPage />
            </React.Suspense>
          }
        />
        <Route
          path="archive"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <ArchivePage />
            </React.Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <React.Suspense fallback={<div>Loading...</div>}>
              <SettingsPage />
            </React.Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;