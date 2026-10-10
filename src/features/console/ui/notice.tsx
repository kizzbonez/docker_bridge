import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { toneSoft, toneText, type Tone } from '@/shared/lib/tone';

interface NoticeProps {
  tone: Tone;
  title: string;
  children?: ReactNode;
  /** Announce it: for a problem that appeared by itself, not one the visitor just caused. */
  alert?: boolean;
}

/** A boxed message: a problem, an empty state, or a rule worth knowing. */
export function Notice({ tone, title, children, alert = false }: NoticeProps) {
  return (
    <div role={alert ? 'alert' : undefined} className={cx('rounded-lg border px-4 py-3', toneSoft[tone])}>
      <p className={cx('font-mono text-xs', toneText[tone])}>{title}</p>
      {children && <div className="mt-1.5 text-sm leading-relaxed text-ink-dim">{children}</div>}
    </div>
  );
}
