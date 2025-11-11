import { useEffect, useRef, useState } from 'react';
import type { TerminalEvent, TerminalSummary, TerminalLogEntry } from '../types';

interface TerminalStateMap {
  [id: string]: TerminalSummary;
}

export interface TerminalDashboardState {
  terminals: TerminalStateMap;
  logs: Record<string, TerminalLogEntry[]>;
}

const initialState: TerminalDashboardState = {
  terminals: {},
  logs: {},
};

export function useTerminalStream(): TerminalDashboardState {
  const [state, setState] = useState<TerminalDashboardState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/terminal-events`);
    wsRef.current = ws;
    ws.onmessage = event => {
      const payload = JSON.parse(event.data) as TerminalEvent & { type?: string };
      handleEvent(payload);
    };
    return () => {
      ws.close();
    };
  }, []);

  const handleEvent = (event: TerminalEvent & { type?: string }) => {
    setState(prev => {
      const next = { ...prev, terminals: { ...prev.terminals }, logs: { ...prev.logs } };
      switch (event.type) {
        case 'TerminalRegistered':
        case 'TerminalStateChanged': {
          const summary = normalizeSummary(event.state);
          if (summary) {
            next.terminals[summary.id] = summary;
          }
          return next;
        }
        case 'TerminalLogAppended': {
          const logEntry = event.entry;
          if (logEntry && event.terminalId) {
            const existing = next.logs[event.terminalId] ?? [];
            next.logs[event.terminalId] = [...existing.slice(-99), logEntry];
          }
          return next;
        }
        default:
          return prev;
      }
    });
  };

  return state;
}

function normalizeSummary(
  state?: TerminalSummary & { tasks?: Record<string, { percentComplete: number; message: string; updatedAt: string }> }
): TerminalSummary | undefined {
  if (!state) return undefined;
  return {
    id: state.id,
    alias: state.alias,
    role: state.role,
    handles: state.handles ?? [],
    status: state.status,
    updatedAt: state.updatedAt,
  };
}
