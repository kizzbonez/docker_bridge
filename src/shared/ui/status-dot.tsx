import { cx } from '@/shared/lib/cx';
import { toneFill, type Tone } from '@/shared/lib/tone';

interface StatusDotProps {
  tone: Tone;
  /** Radar ring that expands and fades: "alive and reporting". */
  ping?: boolean;
  /** Hard blink for alerts. */
  alarm?: boolean;
}

export function StatusDot({ tone, ping = false, alarm = false }: StatusDotProps) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
      {ping && <span className={cx('absolute inset-0 animate-radar rounded-full', toneFill[tone])} />}
      <span className={cx('relative h-2.5 w-2.5 rounded-full', toneFill[tone], alarm && 'animate-pulse')} />
    </span>
  );
}
