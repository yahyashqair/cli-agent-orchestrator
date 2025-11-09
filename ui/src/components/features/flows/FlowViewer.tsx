import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Trash2,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  RotateCw,
  Plus,
  Settings,
  Terminal as TerminalIcon
} from 'lucide-react';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';

interface FlowViewerProps {
  onCreateFlow: () => void;
  className?: string;
}

export default function FlowViewer({ onCreateFlow, className }: FlowViewerProps) {
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: flows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['flows'],
    queryFn: api.listFlows,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const enableFlowMutation = useMutation({
    mutationFn: api.enableFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
    },
  });

  const disableFlowMutation = useMutation({
    mutationFn: api.disableFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
    },
  });

  const executeFlowMutation = useMutation({
    mutationFn: api.executeFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const removeFlowMutation = useMutation({
    mutationFn: api.removeFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      setSelectedFlow(null);
    },
  });

  const stats = useMemo(() => {
    const enabled = flows.filter(flow => flow.enabled).length;
    const disabled = flows.length - enabled;
    const withNextRun = flows.filter(flow => flow.next_run).length;

    return {
      total: flows.length,
      enabled,
      disabled,
      withNextRun,
    };
  }, [flows]);

  const handleToggleFlow = (flowName: string, enabled: boolean) => {
    if (enabled) {
      disableFlowMutation.mutate(flowName);
    } else {
      enableFlowMutation.mutate(flowName);
    }
  };

  const handleExecuteFlow = (flowName: string) => {
    if (confirm(`Execute flow "${flowName}" now? This will launch a new agent session.`)) {
      executeFlowMutation.mutate(flowName);
    }
  };

  const handleRemoveFlow = (flowName: string) => {
    if (confirm(`Remove flow "${flowName}"? This action cannot be undone.`)) {
      removeFlowMutation.mutate(flowName);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatSchedule = (schedule: string) => {
    // Simple cron expression formatter for common patterns
    const patterns: Record<string, string> = {
      '0 * * * *': 'Every hour',
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * *': 'Daily at 9 AM',
      '0 17 * * *': 'Daily at 5 PM',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on 1st',
    };
    return patterns[schedule] || schedule;
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-96", className)}>
        <div className="flex flex-col items-center space-y-4">
          <RotateCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading flows...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-96 p-6", className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load flows</h3>
        <p className="text-muted-foreground text-center mb-6">
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          <RotateCw className="h-4 w-4 mr-2 inline" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Scheduled Flows</h2>
          <p className="text-muted-foreground">
            Manage and execute automation flows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => refetch()} className="px-3 py-2 border border-input rounded-md hover:bg-accent">
            <RotateCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button onClick={onCreateFlow} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Flow
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 border rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-muted rounded-lg mr-4">
              <div className="h-4 w-4 bg-muted-foreground rounded"></div>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Flows</p>
            </div>
          </div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-4">
              <Play className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.enabled}</p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </div>
          </div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg mr-4">
              <Pause className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.disabled}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </div>
          </div>
        </div>
        <div className="p-6 border rounded-lg">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-4">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withNextRun}</p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Flow List */}
      {flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 p-6 border rounded-lg">
          <Clock className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No flows configured</h3>
          <p className="text-muted-foreground text-center mb-6">
            Create your first scheduled flow to automate agent sessions.
          </p>
          <button onClick={onCreateFlow} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Flow
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {flows.map((flow) => (
            <div
              key={flow.name}
              className={cn(
                "p-4 border rounded-lg transition-all hover:shadow-md",
                selectedFlow === flow.name ? "border-primary bg-primary/5" : "",
                !flow.enabled ? "opacity-60" : ""
              )}
              onClick={() => setSelectedFlow(selectedFlow === flow.name ? null : flow.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium">{flow.name}</h3>
                  {flow.enabled ? (
                    <Play className="h-4 w-4 text-green-500" />
                  ) : (
                    <Pause className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "px-2 py-1 text-xs rounded-full",
                    flow.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {flow.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    className="p-1 hover:bg-accent rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlow(flow.name, flow.enabled);
                    }}
                    title={flow.enabled ? 'Disable flow' : 'Enable flow'}
                  >
                    {flow.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    className="p-1 hover:bg-accent rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteFlow(flow.name);
                    }}
                    title="Execute flow now"
                    disabled={!flow.enabled}
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-accent rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFlow(flow.name);
                    }}
                    title="Remove flow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1 mb-3">
                <div className="flex items-center space-x-2">
                  {flow.schedule && (
                    <>
                      <Calendar className="h-3 w-3" />
                      <span>{formatSchedule(flow.schedule)}</span>
                    </>
                  )}
                </div>
                {flow.agent_profile && (
                  <div className="flex items-center space-x-2">
                    <TerminalIcon className="h-3 w-3" />
                    <span>{flow.agent_profile}</span>
                  </div>
                )}
                {flow.provider && (
                  <div className="flex items-center space-x-2">
                    <span>{flow.provider}</span>
                  </div>
                )}
              </div>

              {selectedFlow === flow.name && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    {flow.file_path && (
                      <div>
                        <label className="text-sm font-medium flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          File Path
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">{flow.file_path}</p>
                      </div>
                    )}
                    {flow.script && (
                      <div>
                        <label className="text-sm font-medium flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Script
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">{flow.script}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Last Run
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDateTime(flow.last_run)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Next Run
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDateTime(flow.next_run)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}