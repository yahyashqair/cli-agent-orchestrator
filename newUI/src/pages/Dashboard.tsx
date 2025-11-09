import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { endpoints } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStatusColor, formatRelativeTime } from '@/lib/utils';
import {
  Terminal,
  GitBranch,
  MessageSquare,
  Activity,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  link?: string;
}

function StatCard({ title, value, description, icon, trend, link }: StatCardProps) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className={`flex items-center mt-2 text-xs ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${!trend.isPositive ? 'rotate-180' : ''}`} />
            {trend.value}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}

function RecentActivity() {
  // Mock data - replace with actual API call
  const activities = [
    {
      id: 1,
      type: 'terminal',
      action: 'Terminal created',
      target: 'session-alpha',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      status: 'success',
    },
    {
      id: 2,
      type: 'flow',
      action: 'Flow executed',
      target: 'data-pipeline',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: 'success',
    },
    {
      id: 3,
      type: 'message',
      action: 'Message sent',
      target: 'agent-cli-001',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'success',
    },
    {
      id: 4,
      type: 'terminal',
      action: 'Terminal error',
      target: 'session-beta',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      status: 'error',
    },
  ];

  return (
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
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                activity.status === 'error' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <Badge variant="outline" className="text-xs">
                    {activity.target}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No recent activity
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="w-full">
            View All Activity
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveSessions() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => endpoints.sessions.list().then(res => res.data),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Active Sessions
        </CardTitle>
        <CardDescription>
          Currently running terminal sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions?.slice(0, 5).map((session: any) => (
            <div key={session.name} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{session.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.terminal_count} terminal{session.terminal_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="status" className="text-xs">
                  {session.status}
                </Badge>
                <Button variant="ghost" size="icon-sm">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {(!sessions || sessions.length === 0) && (
            <div className="text-center py-6 text-muted-foreground">
              No active sessions
            </div>
          )}
        </div>
        {sessions && sessions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Link to="/sessions">
              <Button variant="outline" size="sm" className="w-full">
                Manage All Sessions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/sessions">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
              <Plus className="w-5 h-5" />
              <span className="text-sm">New Session</span>
            </Button>
          </Link>
          <Link to="/flows">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
              <GitBranch className="w-5 h-5" />
              <span className="text-sm">Create Flow</span>
            </Button>
          </Link>
          <Link to="/agents">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
              <Terminal className="w-5 h-5" />
              <span className="text-sm">Add Agent</span>
            </Button>
          </Link>
          <Button variant="outline" className="w-full h-auto p-4 flex flex-col gap-2">
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">Send Message</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => endpoints.sessions.list().then(res => res.data),
  });

  const { data: flows } = useQuery({
    queryKey: ['flows'],
    queryFn: () => endpoints.flows.list().then(res => res.data),
  });

  const { data: messages } = useQuery({
    queryKey: ['pending-messages'],
    queryFn: () => endpoints.messages.getPendingCount().then(res => res.data),
  });

  const activeSessions = sessions?.filter((s: any) => s.status === 'active') || [];
  const activeFlows = flows?.filter((f: any) => f.enabled) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your CLI Agent Orchestrator.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Quick Start
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Sessions"
          value={activeSessions.length}
          description={`${sessions?.length || 0} total sessions`}
          icon={<Terminal />}
          link="/sessions"
          trend={{
            value: 12,
            isPositive: true,
          }}
        />
        <StatCard
          title="Active Flows"
          value={activeFlows.length}
          description={`${flows?.length || 0} total flows`}
          icon={<GitBranch />}
          link="/flows"
          trend={{
            value: 8,
            isPositive: true,
          }}
        />
        <StatCard
          title="Pending Messages"
          value={messages?.count || 0}
          description="In communication queue"
          icon={<MessageSquare />}
          link="/messages"
        />
        <StatCard
          title="System Health"
          value={98}
          description="Overall system status"
          icon={<Activity />}
          trend={{
            value: 2,
            isPositive: false,
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ActiveSessions />
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}