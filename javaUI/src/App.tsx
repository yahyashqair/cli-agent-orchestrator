import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TerminalList } from './components/TerminalList';
import { LogPanel } from './components/LogPanel';
import { ActorGraph } from './components/ActorGraph';
import { ProgressBoard } from './components/ProgressBoard';
import { useTerminalStream } from './hooks/useTerminalStream';
import type { TerminalSummary } from './types';

export default function App() {
  const { data: terminals = [] } = useQuery<TerminalSummary[]>(
    ['terminals'],
    async () => {
      const response = await axios.get<TerminalSummary[]>('/api/terminals');
      return response.data;
    },
    { refetchInterval: 10000 }
  );

  const { terminals: liveTerminals, logs } = useTerminalStream();
  const mergedTerminals = mergeTerminals(terminals, Object.values(liveTerminals));

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Java Agent Orchestrator</h1>
          <p className="text-sm text-slate-400">Real-time actor orchestration dashboard</p>
        </div>
        <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">Live</div>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TerminalList terminals={mergedTerminals} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <ActorGraph terminals={mergedTerminals} />
          <ProgressBoard terminals={mergedTerminals} />
          <LogPanel logs={logs} terminals={liveTerminals} />
        </div>
      </div>
    </div>
  );
}

function mergeTerminals(snapshot: TerminalSummary[], live: TerminalSummary[]): TerminalSummary[] {
  const map = new Map<string, TerminalSummary>();
  snapshot.forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  live.forEach(item => map.set(item.id, item));
  return Array.from(map.values()).sort((a, b) => a.alias.localeCompare(b.alias));
}
