import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from '@/shared/lib/cx';

const CONTROL =
  'w-full rounded-md border border-cyan-500/25 bg-carbon-950/70 px-3 py-2 font-mono text-sm text-ink ' +
  'placeholder:text-ink-mute transition-colors duration-200 hover:border-cyan-400/40 focus:border-cyan-400/60';

interface FieldProps {
  label: string;
  htmlFor: string;
  /** Right-aligned note, typically the current value or a unit. */
  hint?: ReactNode;
  children: ReactNode;
}

/** Label + control wrapper used by every playground parameter. */
export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 font-mono text-xs text-sky-300">
        <span>{label}</span>
        {hint !== undefined && <span className="text-ink-mute">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" spellCheck={false} autoComplete="off" className={cx(CONTROL, className)} {...rest} />;
}

export function SelectInput({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(CONTROL, className)} {...rest} />;
}

export function RangeInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="range" className={cx('w-full cursor-pointer accent-cyan-500', className)} {...rest} />;
}
