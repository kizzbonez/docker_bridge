import { cx } from '@/shared/lib/cx';
import { clamp } from '@/shared/lib/format';
import { toneFill, type Tone } from '@/shared/lib/tone';

interface MeterBarProps {
  label: string;
  value: number;
  max: number;
  tone: Tone;
}

export function MeterBar({ label, value, max, tone }: MeterBarProps) {
  const ratio = clamp(value / max, 0, 1);
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className="block h-1.5 overflow-hidden rounded-full bg-carbon-600/80"
    >
      <span
        className={cx('block h-full origin-left rounded-full transition-transform duration-700', toneFill[tone])}
        style={{ transform: `scaleX(${ratio})` }}
      />
    </span>
  );
}
