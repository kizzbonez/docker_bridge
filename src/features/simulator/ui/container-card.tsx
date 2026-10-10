import type { ContainerId, ContainerState } from '@/mock-bridge/types';
import { cx } from '@/shared/lib/cx';
import type { Tone } from '@/shared/lib/tone';
import { Badge } from '@/shared/ui/badge';
import { StatusDot } from '@/shared/ui/status-dot';
import { ContainerMetrics } from './container-metrics';
import { HEALTH_TONE } from './health';

const FRAME: Record<Tone, string> = {
  ok: 'glass-hover',
  signal: 'glass-hover',
  mute: '',
  warn: 'border-amber-500/55',
  crit: 'animate-alarm border-red-500/70',
};

function ExitAlert({ container }: { container: ContainerState }) {
  return (
    <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 font-mono text-[11px] text-red-400">
      <span aria-hidden="true">⚠ </span>
      ExitCode: {container.exitCode} ({container.exitReason}) · restarts {container.restarts}
    </p>
  );
}

interface ContainerCardProps {
  container: ContainerState;
  selected: boolean;
  onSelect: (id: ContainerId) => void;
}

/** One node of the mesh. The name is a button that stretches over the card. */
export function ContainerCard({ container, selected, onSelect }: ContainerCardProps) {
  const tone = HEALTH_TONE[container.health];
  return (
    <article
      data-testid={`container-${container.id}`}
      data-health={container.health}
      className={cx('glass relative p-3', FRAME[tone], selected && 'ring-1 ring-sky-400/70')}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <h3 className="flex items-center gap-2 font-mono text-sm text-ink">
          <StatusDot tone={tone} ping={container.health === 'healthy'} alarm={tone === 'crit'} />
          <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(container.id)}
            className="after:absolute after:inset-0 after:rounded-xl"
          >
            {container.id}
          </button>
        </h3>
        <Badge tone={tone}>{container.health}</Badge>
      </header>
      <p className="mt-1 truncate font-mono text-[11px] text-ink-mute">{container.image}</p>
      <ContainerMetrics container={container} />
      {container.exitCode !== null && <ExitAlert container={container} />}
    </article>
  );
}
