import type { ContainerState } from '@/mock-bridge/types';
import { MeterBar } from '@/shared/ui/meter-bar';
import { MetricRow } from '@/shared/ui/metric-row';
import { cpuTone, memoryTone } from './health';

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
