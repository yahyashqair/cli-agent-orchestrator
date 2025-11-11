import { ActorGraph } from './components/ActorGraph';
import { useTerminalEvents } from './hooks/useTerminalEvents';

const statusClasses: Record<string, string> = {
  IDLE: 'bg-amber-500/20 text-amber-300',
  ACTIVE: 'bg-emerald-500/20 text-emerald-300',
  COMPLETED: 'bg-sky-500/20 text-sky-300',
  ERROR: 'bg-rose-500/20 text-rose-300',
};

const App = () => {
  const { terminals, links } = useTerminalEvents();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-8 py-6">
        <h1 className="text-3xl font-bold">Java Agent Orchestrator</h1>
        <p className="text-slate-400 mt-2">
          Real-time view of terminal actors, communications, and task progress.
        </p>
      </header>

      <main className="px-8 py-6 space-y-10">
        <section>
          <h2 className="text-xl font-semibold mb-4">Actor Network</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <ActorGraph terminals={terminals} links={links} />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Terminals</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {terminals.map((terminal) => (
              <article
                key={terminal.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-900/30"
              >
                <header className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{terminal.alias}</h3>
                    <p className="text-sm text-slate-400">Role: {terminal.role}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      statusClasses[terminal.status] ?? 'bg-slate-700'
                    }`}
                  >
                    {terminal.status}
                  </span>
                </header>

                <section className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-300">Task Progress</h4>
                  <ul className="mt-2 space-y-2 text-sm text-slate-300">
                    {Object.values(terminal.tasks).length === 0 && (
                      <li className="text-slate-500">No tasks assigned.</li>
                    )}
                    {Object.values(terminal.tasks).map((task) => (
                      <li key={task.taskId} className="flex items-center justify-between">
                        <span>{task.taskId}</span>
                        <span className="text-xs text-slate-400">{task.status}</span>
                        <span className="font-mono text-xs">{Math.round(task.progress * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-300">Recent Logs</h4>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {terminal.logs.slice(0, 5).map((log) => (
                      <li key={log.timestamp + log.message}>
                        <span className="font-semibold text-slate-300">[{log.level}]</span> {log.message}
                      </li>
                    ))}
                    {terminal.logs.length === 0 && <li>No activity yet.</li>}
                  </ul>
                </section>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
