import { formatInt, formatPercent } from '@/shared/lib/format';
import { GlassPanel } from '@/shared/ui/glass-panel';
import type { ActivityView, EngineSummary } from '../model/console-api';

interface Tile {
  label: string;
  value: string;
  note: string;
}

const DASH = '—';
const plural = (count: number, one: string, many: string): string => `${formatInt(count)} ${count === 1 ? one : many}`;

function engineTiles(engine: EngineSummary | null): Tile[] {
  if (!engine?.reachable) {
    return [
      { label: 'Containers running', value: DASH, note: 'waiting for the engine' },
      { label: 'Compose projects', value: DASH, note: 'waiting for the engine' },
    ];
  }
  return [
    { label: 'Containers running', value: formatInt(engine.containers.running), note: `of ${plural(engine.containers.total, 'container', 'containers')} visible` },
    { label: 'Compose projects', value: formatInt(engine.projects.length), note: `and ${plural(engine.standalone, 'standalone container', 'standalone containers')}` },
  ];
}

function activityTiles(activity: ActivityView | null): Tile[] {
  if (activity === null) {
    return [
      { label: 'Tool calls on record', value: DASH, note: 'loading the activity log' },
      { label: 'Tokens kept out of context', value: DASH, note: 'loading the activity log' },
    ];
  }
  const { calls, refused, tokens, clients } = activity.totals;
  const share = tokens.raw > 0 ? `${formatPercent(tokens.saved / tokens.raw)} of what the raw log tails cost` : 'no log has been tailed yet';
  return [
    { label: 'Tool calls on record', value: formatInt(calls), note: `${plural(clients.length, 'client', 'clients')} · ${formatInt(refused)} refused` },
    { label: 'Tokens kept out of context', value: formatInt(tokens.saved), note: share },
  ];
}

function StatTile({ tile }: { tile: Tile }) {
  return (
    <GlassPanel className="p-4">
      <dt className="font-mono text-[11px] tracking-wider text-sky-300 uppercase">{tile.label}</dt>
      <dd className="mt-2 font-display text-3xl font-semibold text-ink tabular-nums">{tile.value}</dd>
      <dd className="mt-1 text-xs leading-relaxed text-ink-mute">{tile.note}</dd>
    </GlassPanel>
  );
}

interface ConsoleHeaderProps {
  engine: EngineSummary | null;
  activity: ActivityView | null;
}

/** The page title and four numbers, every one of them read from the engine or the activity log. */
export function ConsoleHeader({ engine, activity }: ConsoleHeaderProps) {
  const tiles = [...engineTiles(engine), ...activityTiles(activity)];
  return (
    <header className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:pt-16">
      <p className="eyebrow">
        <span className="text-ink-mute">console //</span> live
      </p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Your Docker Engine, as your agents see it.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-dim">
        Everything here is read live from the engine on this machine, through the same three tools an MCP client calls.
        Nothing on this page is simulated.
      </p>
      <dl data-testid="overview" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} tile={tile} />
        ))}
      </dl>
    </header>
  );
}
