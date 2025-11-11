import { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';
import type { TerminalSummary } from '../types';

interface Props {
  terminals: TerminalSummary[];
}

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

export function ActorGraph({ terminals }: Props) {
  const [diagramSvg, setDiagramSvg] = useState('');

  const definition = useMemo(() => {
    const nodes = terminals.map(terminal => `  ${terminal.alias.replace(/[^a-zA-Z0-9_]/g, '_')}[${terminal.alias}\\n${terminal.role}]`);
    const orchestrator = '  orchestrator((Session Orchestrator))';
    const edges = terminals.map(terminal => `  orchestrator --> ${terminal.alias.replace(/[^a-zA-Z0-9_]/g, '_')}`);
    return ['graph TD', orchestrator, ...nodes, ...edges].join('\n');
  }, [terminals]);

  useEffect(() => {
    mermaid.render(`graph-${Date.now()}`, definition).then(({ svg }) => setDiagramSvg(svg));
  }, [definition]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="text-lg font-semibold text-slate-200">Actor Topology</h2>
      <div className="mt-3" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
    </div>
  );
}
