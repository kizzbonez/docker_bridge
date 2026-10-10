import type { ReactNode } from 'react';
import { formatInt } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { LinkButton } from '@/shared/ui/button';
import csvUrl from '../data/token-economy.csv?url';
import type { Economy } from '../model/economy';

const percent = (ratio: number): string => `${(ratio * 100).toFixed(1)}%`;
const times = (factor: number): string => `${formatInt(factor)}×`;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-display text-3xl font-semibold text-emerald-400">{children}</p>
      <p className="font-mono text-[11px] text-ink-mute">{label}</p>
    </div>
  );
}

/** The headline result of the comparison, plus the dataset behind it. */
export function ReductionBanner({ economy }: { economy: Economy }) {
  const headroom = economy.bridged.cyclesThatFit / Math.max(1, economy.raw.cyclesThatFit);
  return (
    <div
      data-testid="reduction-banner"
      className="flex flex-wrap items-center justify-between gap-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4"
    >
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Stat label="fewer tokens per cycle">
          <AnimatedNumber value={economy.reduction} format={percent} />
        </Stat>
        <Stat label="tokens saved per cycle">
          <AnimatedNumber value={economy.tokensSaved} />
        </Stat>
        <Stat label="more cycles per context window">
          <AnimatedNumber value={headroom} format={times} />
        </Stat>
      </div>
      <LinkButton href={csvUrl} download="dockerbridge-token-economy.csv" className="text-xs">
        ⤓ Download benchmark CSV
      </LinkButton>
    </div>
  );
}
