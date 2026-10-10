import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { toneSoft, toneText, type Tone } from '@/shared/lib/tone';

interface BadgeProps {
  tone: Tone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide whitespace-nowrap',
        toneSoft[tone],
        toneText[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
