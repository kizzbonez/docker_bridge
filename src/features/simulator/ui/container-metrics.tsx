import type { ReactNode } from 'react';
import type { ContainerState } from '@/mock-bridge/types';
import { MeterBar } from '@/shared/ui/meter-bar';
import { cpuTone, memoryTone } from './health';

interface MetricRowProps {
  label: string;
  value: string;
  children: ReactNode;
}

// One <dt> with two <dd>s (reading + gauge) directly inside the group: valid <dl> content.
function MetricRow({ label, value, children }: MetricRowProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="text-ink-dim tabular-nums">{value}</dd>
      <dd className="w-full">{children}</dd>
    </div>
  );
}

/** CPU % and memory-vs-limit gauges for one container. */
export function ContainerMetrics({ container }: { container: ContainerState }) {
  const { id, cpuPercent, memUsedMb, memLimitMb } = container;
  return (
    <dl className="mt-3 space-y-2 font-mono text-[11px]">
      <MetricRow label="CPU" value={`${cpuPercent.toFixed(1)}%`}>
        <MeterBar label={`${id} CPU percent`} value={cpuPercent} max={100} tone={cpuTone(cpuPercent)} />
      </MetricRow>
      <MetricRow label="MEM" value={`${memUsedMb} / ${memLimitMb} MiB`}>
        <MeterBar label={`${id} memory in MiB`} value={memUsedMb} max={memLimitMb} tone={memoryTone(container)} />
      </MetricRow>
    </dl>
  );
}
