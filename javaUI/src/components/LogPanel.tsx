import type { TerminalLogEntry, TerminalSummary } from '../types';

interface Props {
  logs: Record<string, TerminalLogEntry[]>;
  terminals: Record<string, TerminalSummary>;
}

export function LogPanel({ logs, terminals }: Props) {
  const entries = Object.entries(logs)
    .flatMap(([terminalId, entries]) => entries.map(entry => ({ terminalId, entry })))
    .sort((a, b) => new Date(b.entry.timestamp).getTime() - new Date(a.entry.timestamp).getTime());

  return (
    <div className="h-full overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-lg font-semibold text-slate-200">Live Logs</h2>
      <div className="mt-3 space-y-2 text-sm">
        {entries.map(({ terminalId, entry }, index) => {
          const terminal = terminals[terminalId];
          return (
            <div key={`${terminalId}-${index}`} className="rounded-md bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{terminal ? `${terminal.alias} (${terminal.role})` : terminalId}</span>
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="mt-1 font-mono text-slate-200">{entry.message}</div>
            </div>
          );
        })}
        {entries.length === 0 && <div className="text-slate-500">No logs yet.</div>}
      </div>
    </div>
  );
}
