import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, FileText, AlertCircle, Info } from 'lucide-react';
import { api } from '../api/client';
import './FlowEditor.css';

interface FlowEditorProps {
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_SCHEDULES = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Daily at 5 PM', value: '0 17 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' },
  { label: 'Monthly on 1st', value: '0 0 1 * *' },
];

export default function FlowEditor({ onClose, onSuccess }: FlowEditorProps) {
  const [filePath, setFilePath] = useState('');
  const [customSchedule, setCustomSchedule] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('0 0 * * *');
  const [useCustomSchedule, setUseCustomSchedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const queryClient = useQueryClient();

  const createFlowMutation = useMutation({
    mutationFn: api.addFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      onSuccess();
    },
    onError: (error) => {
      const message =
        (error instanceof Error && error.message) ||
        'Failed to create flow. Please check the file path and try again.';
      setErrorMessage(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!filePath.trim()) {
      setErrorMessage('Please enter a file path');
      return;
    }

    const schedule = useCustomSchedule ? customSchedule : selectedSchedule;
    if (!schedule.trim()) {
      setErrorMessage('Please enter a schedule');
      return;
    }

    createFlowMutation.mutate(filePath.trim());
  };

  const handleScheduleChange = (value: string) => {
    if (COMMON_SCHEDULES.some(s => s.value === value)) {
      setSelectedSchedule(value);
      setUseCustomSchedule(false);
    } else {
      setCustomSchedule(value);
      setUseCustomSchedule(true);
    }
  };

  const generateFlowTemplate = () => {
    const template = `---
name: "my-scheduled-flow"
schedule: "${useCustomSchedule ? customSchedule : selectedSchedule}"
agent_profile: "developer"
provider: "q_cli"  # Options: q_cli, claude_code, codex_cli, opencode
script: ""  # Optional path to script that determines if flow should run
---

# Your flow prompt template goes here
# This will be sent to the agent when the flow executes
# You can use template variables from your script output

Please analyze the latest code changes and provide a summary of any issues that need attention.`;
    
    const blob = new Blob([template], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flow-template.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flow-editor-overlay" onClick={onClose}>
      <div className="flow-editor" onClick={(e) => e.stopPropagation()}>
        <div className="flow-editor-header">
          <h2>Create New Flow</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flow-editor-form">
          <div className="form-group">
            <label htmlFor="filePath">
              <FileText size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Flow File Path
            </label>
            <input
              id="filePath"
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/path/to/your-flow.md"
              className="form-control"
              required
            />
            <p className="helper-text">
              Path to a markdown file with frontmatter containing flow configuration
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="schedule">Schedule</label>
            <select
              id="schedule"
              value={useCustomSchedule ? customSchedule : selectedSchedule}
              onChange={(e) => handleScheduleChange(e.target.value)}
              className="form-control"
            >
              {COMMON_SCHEDULES.map((schedule) => (
                <option key={schedule.value} value={schedule.value}>
                  {schedule.label}
                </option>
              ))}
              <option value="">Custom cron expression...</option>
            </select>
          </div>

          {useCustomSchedule && (
            <div className="form-group">
              <label htmlFor="customSchedule">Custom Cron Expression</label>
              <input
                id="customSchedule"
                type="text"
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                placeholder="0 9 * * 1-5 (weekdays at 9 AM)"
                className="form-control"
                required
              />
              <p className="helper-text">
                Use standard cron format: minute hour day month weekday
              </p>
            </div>
          )}

          <div className="form-group">
            <div className="flow-template-section">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={generateFlowTemplate}
              >
                <FileText size={14} />
                Download Flow Template
              </button>
              <div className="template-info">
                <Info size={14} />
                <span>
                  Download a template file to understand the required format.
                  Fill it with your configuration and prompt, then reference it above.
                </span>
              </div>
            </div>
          </div>

          <div className="flow-requirements">
            <h4>Flow File Requirements:</h4>
            <ul>
              <li>Markdown format with YAML frontmatter</li>
              <li>Required frontmatter fields: name, schedule, agent_profile</li>
              <li>Optional fields: provider (defaults to q_cli), script</li>
              <li>Content after frontmatter is the prompt template</li>
              <li>Script (optional) should output JSON with "execute" and "output" fields</li>
            </ul>
          </div>

          {errorMessage && (
            <div className="error-message">
              <AlertCircle size={16} />
              {errorMessage}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createFlowMutation.isPending}
            >
              {createFlowMutation.isPending ? 'Creating...' : 'Create Flow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
