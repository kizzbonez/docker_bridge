import { cx } from '@/shared/lib/cx';
import { formatInt, formatPercent, formatUsd } from '@/shared/lib/format';
import { toneText, type Tone } from '@/shared/lib/tone';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { MeterBar } from '@/shared/ui/meter-bar';
import { CONTEXT_WINDOW, type SideEconomy } from '../model/economy';

interface ContextGaugeProps {
  side: SideEconomy;
  cycles: number;
  tone: Tone;
}

function ContextGauge({ side, cycles, tone }: ContextGaugeProps) {
  const overflow = side.contextShare > 1;
  return (
    <div className="mt-5 font-mono text-[11px]">
      <p className="mb-1.5 flex flex-wrap justify-between gap-x-3 text-ink-mute">
        <span>
          {cycles} cycles · {formatInt(side.sessionTokens)} tokens
        </span>
        <span className={overflow ? 'text-red-400' : toneText[tone]}>
          {formatPercent(side.contextShare, side.contextShare < 0.1 ? 1 : 0)} of 200k window
        </span>
      </p>
      <MeterBar label="Share of context window used" value={Math.min(side.sessionTokens, CONTEXT_WINDOW)} max={CONTEXT_WINDOW} tone={overflow ? 'crit' : tone} />
      <p className={cx('mt-2', overflow ? 'text-red-400' : 'text-ink-dim')}>
        {overflow
          ? `Exceeds the context limit after cycle ${side.cyclesThatFit}.`
          : `${formatInt(side.cyclesThatFit)} cycles fit before the window fills.`}
      </p>
    </div>
  );
}

interface EconomyCardProps {
  testId: string;
  tone: Tone;
  title: string;
  subtitle: string;
  side: SideEconomy;
  cycles: number;
  facts: string[];
}

/** One side of the comparison: tokens, cost, what gets ingested, context pressure. */
export function EconomyCard({ testId, tone, title, subtitle, side, cycles, facts }: EconomyCardProps) {
  return (
    <GlassPanel hover data-testid={testId} className="p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="font-mono text-xs text-ink-mute">{subtitle}</p>
      <p className="mt-4 font-display leading-none">
        <AnimatedNumber value={side.tokensPerCycle} className={cx('text-5xl font-semibold', toneText[tone])} />
        <span className="ml-2 font-mono text-xs text-ink-mute">tokens / debug cycle</span>
      </p>
      <p className="mt-2 font-mono text-sm text-ink-dim">
        <AnimatedNumber value={side.costPerCycle} format={formatUsd} /> per cycle
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-ink-dim">
        {facts.map((fact) => (
          <li key={fact} className="flex gap-2">
            <span aria-hidden="true" className={toneText[tone]}>
              ▸
            </span>
            {fact}
          </li>
        ))}
      </ul>
      <ContextGauge side={side} cycles={cycles} tone={tone} />
    </GlassPanel>
  );
}
