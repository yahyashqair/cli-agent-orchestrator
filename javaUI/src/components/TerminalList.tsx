import type { TerminalSummary } from '../types';

interface Props {
  terminals: TerminalSummary[];
}

const statusColors: Record<string, string> = {
  IDLE: 'bg-emerald-500/20 text-emerald-300',
  PROCESSING: 'bg-sky-500/20 text-sky-300',
  BLOCKED: 'bg-amber-500/20 text-amber-300',
  COMPLETED: 'bg-lime-500/20 text-lime-200',
  ERROR: 'bg-rose-500/20 text-rose-300',
};

export function TerminalList({ terminals }: Props) {
  return (
    <div className="space-y-2">
      {terminals.map(terminal => (
        <div key={terminal.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{terminal.alias}</h3>
              <p className="text-sm text-slate-400">{terminal.role}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                statusColors[terminal.status] ?? 'bg-slate-700 text-slate-200'
              }`}
            >
              {terminal.status}
            </span>
          </div>
          <div className="mt-2 text-sm text-slate-300">
            <span className="font-mono text-xs uppercase text-slate-500">Handles:</span> {terminal.handles.join(', ') || '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Updated {new Date(terminal.updatedAt).toLocaleTimeString()}</div>
        </div>
      ))}
      {terminals.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-slate-500">
          No terminals registered yet.
        </div>
      )}
    </div>
  );
}
