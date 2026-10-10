/** Semantic status tones. Class names are spelled out so Tailwind can see them. */
export type Tone = 'signal' | 'ok' | 'warn' | 'crit' | 'mute';

export const toneText: Record<Tone, string> = {
  signal: 'text-sky-400',
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  crit: 'text-red-400',
  mute: 'text-ink-mute',
};

export const toneFill: Record<Tone, string> = {
  signal: 'bg-cyan-500',
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  crit: 'bg-red-500',
  mute: 'bg-ink-mute',
};

export const toneSoft: Record<Tone, string> = {
  signal: 'border-cyan-500/30 bg-cyan-500/10',
  ok: 'border-emerald-500/30 bg-emerald-500/10',
  warn: 'border-amber-500/35 bg-amber-500/10',
  crit: 'border-red-500/40 bg-red-500/10',
  mute: 'border-ink-mute/30 bg-ink-mute/10',
};

export const toneStroke: Record<Tone, string> = {
  signal: 'stroke-cyan-500',
  ok: 'stroke-emerald-500',
  warn: 'stroke-amber-500',
  crit: 'stroke-red-500',
  mute: 'stroke-ink-mute',
};
