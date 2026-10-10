import { cx } from '@/shared/lib/cx';

export type ButtonVariant = 'primary' | 'ghost' | 'quiet';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-sm ' +
  'transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-cyan-400/60 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 hover:shadow-[0_0_24px_rgba(6,182,212,0.35)]',
  ghost: 'border-cyan-500/25 bg-carbon-800/60 text-ink hover:border-cyan-400/50 hover:text-cyan-300',
  quiet: 'border-transparent text-ink-dim hover:bg-white/5 hover:text-ink',
};

export function buttonClass(variant: ButtonVariant, className?: string): string {
  return cx(BASE, VARIANTS[variant], className);
}
