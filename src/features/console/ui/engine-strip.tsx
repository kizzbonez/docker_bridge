import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import { StatusDot } from '@/shared/ui/status-dot';
import type { Polled } from '../hooks/use-polling';
import type { BridgeInfo, EngineSummary, EngineUp } from '../model/console-api';

type Engine = Polled<EngineSummary>;

function BridgeBadges({ bridge }: { bridge: BridgeInfo }) {
  const scope = bridge.scope === null ? 'all projects' : bridge.scope.join(', ');
  return (
    <>
      <Badge tone={bridge.readOnly ? 'ok' : 'warn'}>bridge: {bridge.readOnly ? 'read-only' : 'read-write'}</Badge>
      <Badge tone="signal">
        <span className="text-ink-mute">scope</span> {scope}
      </Badge>
    </>
  );
}

function Reachable({ summary }: { summary: EngineUp }) {
  return (
    <>
      <Badge tone="ok">
        <StatusDot tone="ok" ping />
        Docker Engine {summary.engine.version} <span className="text-ink-mute">({summary.engine.os})</span>
      </Badge>
      <Badge tone="signal">
        <span data-testid="running-count" className="tabular-nums">
          {summary.containers.running} / {summary.containers.total}
        </span>
        <span className="text-ink-mute">running</span>
      </Badge>
      <BridgeBadges bridge={summary.bridge} />
    </>
  );
}

function readout(engine: Engine): ReactNode {
  const { data, error } = engine;
  if (data === null) {
    return <Badge tone={error ? 'crit' : 'mute'}>{error ? 'console service not answering' : 'connecting to the engine…'}</Badge>;
  }
  if (!data.reachable) {
    return (
      <>
        <Badge tone="crit">
          <StatusDot tone="crit" alarm />
          Docker Engine: unreachable
        </Badge>
        <BridgeBadges bridge={data.bridge} />
      </>
    );
  }
  return <Reachable summary={data} />;
}

/** The engine's real state, shown once at the very top of the page. */
export function EngineStrip({ engine }: { engine: Engine }) {
  return (
    <section aria-label="Engine status" className="border-b border-cyan-500/10 bg-carbon-950/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-1.5 sm:px-6">
        {readout(engine)}
        <Badge tone="ok" className="sm:ml-auto">
          live data
        </Badge>
      </div>
    </section>
  );
}

/** Compact indicator that stays in the sticky bar while scrolling. */
export function EnginePill({ engine }: { engine: Engine }) {
  const { data } = engine;
  if (data === null) return <Badge tone="mute">ENGINE …</Badge>;
  if (!data.reachable) return <Badge tone="crit">ENGINE DOWN</Badge>;
  return (
    <Badge tone="ok">
      <StatusDot tone="ok" ping />
      ENGINE LIVE
      <span className="text-ink-mute tabular-nums">{data.containers.running} up</span>
    </Badge>
  );
}
