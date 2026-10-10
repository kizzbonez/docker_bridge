import { BENCHMARKS } from '@/features/token-economy/model/benchmarks';
import { formatInt } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { GlassPanel } from '@/shared/ui/glass-panel';

interface Stat {
  label: string;
  value: number;
  format: (value: number) => string;
}

const headline = BENCHMARKS[0];
const saved = headline ? headline.rawTokens - headline.bridgedTokens : 0;
const reduction = headline ? 1 - headline.bridgedTokens / headline.rawTokens : 0;

// Latency and memory are illustrative constants for the simulated server.
const STATS: Stat[] = [
  { label: 'tokens saved per debug cycle', value: saved, format: formatInt },
  { label: 'smaller tool output', value: reduction * 100, format: (v) => `${Math.round(v)}%` },
  { label: 'median tool latency', value: 12, format: (v) => `${Math.round(v)} ms` },
  { label: 'bridge memory footprint', value: 38, format: (v) => `${Math.round(v)} MB` },
];

/** Animated headline counters under the hero. */
export function HeroStats() {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4" data-testid="hero-stats">
      {STATS.map((stat) => (
        // dt precedes dd in the DOM (valid <dl>); the column is reversed visually.
        <GlassPanel key={stat.label} hover className="flex flex-col-reverse justify-end px-4 py-4">
          <dt className="mt-1 font-mono text-[11px] leading-snug text-ink-mute">{stat.label}</dt>
          <dd className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            <AnimatedNumber value={stat.value} format={stat.format} />
          </dd>
        </GlassPanel>
      ))}
    </dl>
  );
}
