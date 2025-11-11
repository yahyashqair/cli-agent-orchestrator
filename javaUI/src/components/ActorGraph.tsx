import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphLink, TerminalView } from '../hooks/useTerminalEvents';

type NodeDatum = d3.SimulationNodeDatum & {
  id: string;
  alias: string;
  role: string;
  status: string;
};

type LinkDatum = {
  source: string;
  target: string;
};

const statusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return '#22c55e';
    case 'COMPLETED':
      return '#38bdf8';
    case 'ERROR':
      return '#ef4444';
    default:
      return '#eab308';
  }
};

export const ActorGraph = ({ terminals, links }: { terminals: TerminalView[]; links: GraphLink[] }) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const width = 640;
    const height = 420;

    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const nodes: NodeDatum[] = terminals.map((terminal) => ({
      id: terminal.alias,
      alias: terminal.alias,
      role: terminal.role,
      status: terminal.status,
    }));

    const linkData: LinkDatum[] = links.map((link) => ({
      source: link.source,
      target: link.target,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink<LinkDatum, NodeDatum>(linkData).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append('g')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', 0.5)
      .selectAll('line')
      .data(linkData)
      .enter()
      .append('line')
      .attr('stroke-width', 2);

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(
        d3
          .drag<SVGGElement, NodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append('circle')
      .attr('r', 24)
      .attr('fill', (d) => statusColor(d.status))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2);

    node
      .append('text')
      .text((d) => d.alias)
      .attr('text-anchor', 'middle')
      .attr('y', 5)
      .attr('fill', '#0f172a')
      .attr('font-size', 12)
      .attr('font-weight', '600');

    node
      .append('title')
      .text((d) => `${d.alias} (${d.role})`);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as NodeDatum & { x: number }).x)
        .attr('y1', (d) => (d.source as NodeDatum & { y: number }).y)
        .attr('x2', (d) => (d.target as NodeDatum & { x: number }).x)
        .attr('y2', (d) => (d.target as NodeDatum & { y: number }).y);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [terminals, links]);

  return <svg ref={ref} viewBox="0 0 640 420" className="w-full h-96" />;
};
