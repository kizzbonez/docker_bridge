import { cx } from '@/shared/lib/cx';
import type { Tone } from '@/shared/lib/tone';
import { Badge } from '@/shared/ui/badge';
import { MeterBar } from '@/shared/ui/meter-bar';
import { MetricRow } from '@/shared/ui/metric-row';
import { StatusDot } from '@/shared/ui/status-dot';
import type { TopologyService } from '../model/console-api';
import { healthTone, shortImage, usageTone } from '../model/describe';

const FRAME: Record<Tone, string> = {
  ok: 'glass-hover',
  signal: 'glass-hover',
  mute: '',
  warn: 'border-amber-500/55',
  crit: 'border-red-500/70',
};

function Metrics({ service }: { service: TopologyService }) {
  const { name, cpu_percent: cpu, memory_mib: memory } = service;
  if (cpu === undefined || memory === undefined) return null;
  const limit = memory.limit;
  return (
    <dl className="mt-3 space-y-2 font-mono text-[11px]">
      <MetricRow label="CPU" value={`${cpu.toFixed(1)}%`}>
        <MeterBar label={`${name} CPU percent`} value={cpu} max={100} tone={usageTone(cpu / 100)} />
      </MetricRow>
      <MetricRow label="MEM" value={limit === null ? `${memory.used} MiB · no limit` : `${memory.used} / ${limit} MiB`}>
        {/* Without a limit there is nothing to measure against: the bar stays empty. */}
        <MeterBar label={`${name} memory in MiB`} value={limit === null ? 0 : memory.used} max={limit ?? 1} tone={limit === null ? 'mute' : usageTone(memory.used / limit)} />
      </MetricRow>
    </dl>
  );
}

function LastExit({ service }: { service: TopologyService }) {
  if (!service.last_exit) return null;
  const { code, reason } = service.last_exit;
  return (
    <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 font-mono text-[11px] text-red-400">
      <span aria-hidden="true">⚠ </span>
      ExitCode: {code}
      {reason ? ` (${reason})` : ''}
    </p>
  );
}

interface ServiceCardProps {
  service: TopologyService;
  /** Services this one declares it depends on. */
  dependsOn: string[];
  selected: boolean;
  onInspect: (name: string) => void;
}

/** One real container. Its name is a link that stretches over the card and opens it below. */
export function ServiceCard({ service, dependsOn, selected, onInspect }: ServiceCardProps) {
  const tone = healthTone(service.health);
  return (
    <article data-testid={`service-${service.name}`} data-health={service.health} className={cx('glass relative p-3', FRAME[tone], selected && 'ring-1 ring-sky-400/70')}>
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <h3 className="flex min-w-0 items-center gap-2 font-mono text-sm text-ink">
          <StatusDot tone={tone} ping={tone === 'ok'} alarm={tone === 'crit'} />
          <a
            href="#inspect"
            aria-current={selected ? 'true' : undefined}
            onClick={() => onInspect(service.name)}
            className="truncate after:absolute after:inset-0 after:rounded-xl"
          >
            {service.name}
          </a>
        </h3>
        <Badge tone={tone}>{service.health}</Badge>
      </header>
      <p className="mt-1 truncate font-mono text-[11px] text-ink-mute">{shortImage(service.image)}</p>
      <Metrics service={service} />
      <LastExit service={service} />
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-mute">
        <span>restarts {service.restarts}</span>
        {dependsOn.length > 0 && <span>needs {dependsOn.join(', ')}</span>}
      </p>
    </article>
  );
}
