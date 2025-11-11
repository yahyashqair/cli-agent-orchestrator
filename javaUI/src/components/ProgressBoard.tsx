import type { TaskProgress, TerminalSummary } from '../types';

interface Props {
  terminals: TerminalSummary[];
}

export function ProgressBoard({ terminals }: Props) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-lg font-semibold text-slate-200">Task Progress</h2>
      <div className="mt-3 space-y-4">
        {terminals.map(terminal => (
          <div key={terminal.id} className="space-y-1">
            <div className="text-sm text-slate-400">{terminal.alias}</div>
            <ProgressBar status={terminal.status} />
          </div>
        ))}
        {terminals.length === 0 && <div className="text-sm text-slate-500">No active tasks.</div>}
      </div>
    </div>
  );
}

function ProgressBar({ status }: { status: string }) {
  const percent = status === 'COMPLETED' ? 100 : status === 'PROCESSING' ? 60 : status === 'BLOCKED' ? 30 : 10;
  return (
    <div className="h-2 w-full rounded-full bg-slate-800">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
