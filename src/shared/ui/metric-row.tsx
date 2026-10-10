import type { ReactNode } from 'react';

interface MetricRowProps {
  label: string;
  value: string;
  /** The gauge under the reading. */
  children: ReactNode;
}

// One <dt> with two <dd>s (reading + gauge) directly inside the group: valid <dl> content.
export function MetricRow({ label, value, children }: MetricRowProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="text-ink-dim tabular-nums">{value}</dd>
      <dd className="w-full">{children}</dd>
    </div>
  );
}
