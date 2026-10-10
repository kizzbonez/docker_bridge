import { cx } from '@/shared/lib/cx';
import { GlassPanel } from '@/shared/ui/glass-panel';

interface NodeProps {
  kicker: string;
  name: string;
  points: string[];
  highlight?: boolean;
}

function Node({ kicker, name, points, highlight = false }: NodeProps) {
  return (
    <GlassPanel hover className={cx('p-5', highlight && 'border-cyan-400/50 bg-cyan-500/5')}>
      <p className="eyebrow">{kicker}</p>
      <h3 className="mt-2 font-display text-xl font-semibold text-ink">{name}</h3>
      <ul className="mt-3 space-y-1.5 text-sm text-ink-dim">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="text-sky-400">
              ▸
            </span>
            {point}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

/** Labelled hop between two nodes: horizontal on desktop, vertical on mobile. */
function Hop({ transport, protocol }: { transport: string; protocol: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-1 text-center font-mono text-[11px] lg:w-36">
      <span className="text-sky-300">{transport}</span>
      <span aria-hidden="true" className="text-lg leading-none text-cyan-400 lg:hidden">
        ⇅
      </span>
      <span aria-hidden="true" className="hidden text-lg leading-none text-cyan-400 lg:inline">
        ⇄
      </span>
      <span className="text-ink-mute">{protocol}</span>
    </div>
  );
}

/** Agent ⇄ bridge ⇄ engine, with what crosses each hop. */
export function ArchitectureFlow() {
  return (
    <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center" data-testid="architecture-flow">
      <div className="lg:flex-1">
        <Node kicker="Agent" name="Any MCP client" points={['Plans the investigation', 'Calls tools, reads compact JSON', 'Drafts the fix as a diff']} />
      </div>
      <Hop transport="stdio" protocol="JSON-RPC 2.0" />
      <div className="lg:flex-[1.25]">
        <Node
          highlight
          kicker="MCP server"
          name="DockerBridge"
          points={['Policy gate: allowlist, deny rules, read-only mode', 'Log pipeline: tail → sanitize → match → dedupe → budget', 'Guarded exec with deadlines']}
        />
      </div>
      <Hop transport="unix socket" protocol="Docker Engine API" />
      <div className="lg:flex-1">
        <Node kicker="Runtime" name="Docker Engine" points={['Containers, logs, stats', 'Health and restart state', 'Never exposed to the model directly']} />
      </div>
    </div>
  );
}
