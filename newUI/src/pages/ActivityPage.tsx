import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Terminal, GitBranch, MessageSquare } from 'lucide-react';

export function ActivityPage() {
  const activities = [
    {
      id: 1,
      type: 'terminal',
      action: 'Session created',
      target: 'data-analysis',
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      status: 'success',
      details: 'Created new session with 3 terminals'
    },
    {
      id: 2,
      type: 'flow',
      action: 'Flow executed',
      target: 'security-scan',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'success',
      details: 'Completed in 2.3 seconds'
    },
    {
      id: 3,
      type: 'message',
      action: 'Message delivered',
      target: 'terminal-beta',
      timestamp: new Date(Date.now() - 1000 * 60 * 8),
      status: 'success',
      details: 'From terminal-alpha'
    },
    {
      id: 4,
      type: 'terminal',
      action: 'Error occurred',
      target: 'processing-session',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: 'error',
      details: 'Provider connection timeout'
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'terminal': return Terminal;
      case 'flow': return GitBranch;
      case 'message': return MessageSquare;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          System activity log and event history.
        </p>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest system events and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                  <div className={`p-2 rounded-full ${
                    activity.status === 'error'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                      : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <Badge variant="outline" className="text-xs">
                        {activity.target}
                      </Badge>
                      <Badge variant={activity.status === 'error' ? 'error' : 'success'} className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {activity.details}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}