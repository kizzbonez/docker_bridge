import type { ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';
import { toneSoft, toneText, type Tone } from '@/shared/lib/tone';

type CalloutKind = 'note' | 'warning' | 'danger';

const KINDS: Record<CalloutKind, { tone: Tone; icon: string; label: string }> = {
  note: { tone: 'signal', icon: 'ℹ', label: 'Note' },
  warning: { tone: 'warn', icon: '▲', label: 'Warning' },
  danger: { tone: 'crit', icon: '⛔', label: 'Danger' },
};

interface CalloutProps {
  kind?: CalloutKind;
  title: string;
  children: ReactNode;
}

/** A boxed aside. The kind is spelled out in text, not conveyed by colour alone. */
export function Callout({ kind = 'note', title, children }: CalloutProps) {
  const { tone, icon, label } = KINDS[kind];
  return (
    <aside className={cx('rounded-xl border p-4', toneSoft[tone])}>
      <p className={cx('font-mono text-xs tracking-wider uppercase', toneText[tone])}>
        <span aria-hidden="true" className="mr-2">
          {icon}
        </span>
        {label} · <span className="text-ink normal-case">{title}</span>
      </p>
      <div className="mt-2 text-sm leading-relaxed text-ink-dim">{children}</div>
    </aside>
  );
}
