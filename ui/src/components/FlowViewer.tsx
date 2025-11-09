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
import { api } from '../api/client';
import './FlowViewer.css';

interface FlowViewerProps {
  onCreateFlow: () => void;
}

export default function FlowViewer({ onCreateFlow }: FlowViewerProps) {
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
      <div className="flow-viewer">
        <div className="flow-loading">
          <RotateCw size={24} className="loading-spinner" />
          <p>Loading flows...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flow-viewer">
        <div className="flow-error">
          <AlertCircle size={32} />
          <h3>Failed to load flows</h3>
          <p>{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
          <button className="btn btn-primary" onClick={() => refetch()}>
            <RotateCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-viewer">
      <div className="flow-header">
        <h2 className="flow-title">Scheduled Flows</h2>
        <div className="flow-actions">
          <button className="btn btn-primary" onClick={onCreateFlow}>
            <Plus size={16} />
            Create Flow
          </button>
          <button className="btn btn-secondary" onClick={() => refetch()}>
            <RotateCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flow-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Flows</div>
        </div>
        <div className="stat-card stat-enabled">
          <div className="stat-value">{stats.enabled}</div>
          <div className="stat-label">Enabled</div>
        </div>
        <div className="stat-card stat-disabled">
          <div className="stat-value">{stats.disabled}</div>
          <div className="stat-label">Disabled</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.withNextRun}</div>
          <div className="stat-label">Scheduled</div>
        </div>
      </div>

      {/* Flow List */}
      {flows.length === 0 ? (
        <div className="flow-empty">
          <Clock size={48} />
          <h3>No flows configured</h3>
          <p>Create your first scheduled flow to automate agent sessions.</p>
          <button className="btn btn-primary" onClick={onCreateFlow}>
            <Plus size={16} />
            Create Flow
          </button>
        </div>
      ) : (
        <div className="flow-list">
          {flows.map((flow) => (
            <div
              key={flow.name}
              className={`flow-item ${selectedFlow === flow.name ? 'selected' : ''} ${!flow.enabled ? 'disabled' : ''}`}
              onClick={() => setSelectedFlow(selectedFlow === flow.name ? null : flow.name)}
            >
              <div className="flow-item-header">
                <div className="flow-info">
                  <div className="flow-name">{flow.name}</div>
                  <div className="flow-meta">
                    <span className={`status-badge ${flow.enabled ? 'status-enabled' : 'status-disabled'}`}>
                      {flow.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="flow-schedule" title="Schedule">
                      <Calendar size={12} />
                      {formatSchedule(flow.schedule)}
                    </span>
                    <span className="flow-agent" title="Agent Profile">
                      <TerminalIcon size={12} />
                      {flow.agent_profile}
                    </span>
                    <span className="flow-provider" title="Provider">
                      {flow.provider}
                    </span>
                  </div>
                </div>
                <div className="flow-item-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFlow(flow.name, flow.enabled);
                    }}
                    title={flow.enabled ? 'Disable flow' : 'Enable flow'}
                  >
                    {flow.enabled ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteFlow(flow.name);
                    }}
                    title="Execute flow now"
                    disabled={!flow.enabled}
                  >
                    <Play size={14} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFlow(flow.name);
                    }}
                    title="Remove flow"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {selectedFlow === flow.name && (
                <div className="flow-details">
                  <div className="flow-detail-grid">
                    <div className="flow-detail-item">
                      <div className="flow-detail-label">
                        <FileText size={14} />
                        File Path
                      </div>
                      <div className="flow-detail-value">{flow.file_path}</div>
                    </div>
                    {flow.script && (
                      <div className="flow-detail-item">
                        <div className="flow-detail-label">
                          <Settings size={14} />
                          Script
                        </div>
                        <div className="flow-detail-value">{flow.script}</div>
                      </div>
                    )}
                    <div className="flow-detail-item">
                      <div className="flow-detail-label">
                        <Clock size={14} />
                        Last Run
                      </div>
                      <div className="flow-detail-value">{formatDateTime(flow.last_run)}</div>
                    </div>
                    <div className="flow-detail-item">
                      <div className="flow-detail-label">
                        <Calendar size={14} />
                        Next Run
                      </div>
                      <div className="flow-detail-value">{formatDateTime(flow.next_run)}</div>
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
