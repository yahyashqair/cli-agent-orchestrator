import { useEffect, useMemo, useState } from 'react';

type TerminalStatus = 'IDLE' | 'ACTIVE' | 'COMPLETED' | 'ERROR';

type TerminalHandle = {
  id: string;
  alias: string;
  role: string;
};

type TerminalLogEntry = {
  timestamp: string;
  level: string;
  message: string;
};

type TaskProgress = {
  taskId: string;
  progress: number;
  status: string;
  updatedAt: string;
};

type TerminalEvent = {
  terminalId: string;
  handle: TerminalHandle;
  type: 'REGISTERED' | 'STATUS_CHANGED' | 'LOG_APPENDED' | 'PROGRESS_UPDATED';
  status?: TerminalStatus;
  logEntry?: TerminalLogEntry;
  progress?: TaskProgress;
  emittedAt: string;
};

export type TerminalView = {
  id: string;
  alias: string;
  role: string;
  status: TerminalStatus;
  logs: TerminalLogEntry[];
  tasks: Record<string, TaskProgress>;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

const parseWsUrl = () => {
  const override = import.meta.env.VITE_WS_URL as string | undefined;
  if (override) {
    return override;
  }
  const base = window.location.origin.replace('http', 'ws');
  return `${base}/ws/events`;
};

export const useTerminalEvents = () => {
  const [terminals, setTerminals] = useState<Map<string, TerminalView>>(new Map());
  const [links, setLinks] = useState<Map<string, GraphLink>>(new Map());

  useEffect(() => {
    const ws = new WebSocket(parseWsUrl());

    ws.onmessage = (event) => {
      const payload: TerminalEvent = JSON.parse(event.data);
      setTerminals((previous) => {
        const next = new Map(previous);
        const existing = next.get(payload.terminalId);
        const base = existing ?? {
          id: payload.terminalId,
          alias: payload.handle.alias,
          role: payload.handle.role,
          status: payload.status ?? 'IDLE',
          logs: [],
          tasks: {},
        };

        if (payload.status) {
          base.status = payload.status;
        }

        if (payload.logEntry) {
          base.logs = [payload.logEntry, ...base.logs].slice(0, 50);
          const match = /Received from ([^:]+):/.exec(payload.logEntry.message);
          if (match) {
            const source = match[1];
            const linkId = `${source}->${base.alias}`;
            setLinks((existingLinks) => {
              const updated = new Map(existingLinks);
              updated.set(linkId, {
                id: linkId,
                source,
                target: base.alias,
                label: payload.logEntry?.message ?? '',
              });
              return updated;
            });
          }
        }

        if (payload.progress) {
          base.tasks = {
            ...base.tasks,
            [payload.progress.taskId]: payload.progress,
          };
        }

        next.set(payload.terminalId, base);
        return next;
      });
    };

    return () => {
      ws.close();
    };
  }, []);

  const graphLinks = useMemo(() => Array.from(links.values()), [links]);
  const terminalList = useMemo(() => Array.from(terminals.values()), [terminals]);

  return {
    terminals: terminalList,
    links: graphLinks,
  };
};
