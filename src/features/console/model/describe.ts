import type { ActivityOutcome } from '@bridge/core/activity-types';
import type { Tone } from '@/shared/lib/tone';
import { ConsoleApiError } from './console-api';

const HEALTH: Record<string, Tone> = {
  healthy: 'ok',
  running: 'ok',
  starting: 'signal',
  completed: 'mute',
  created: 'mute',
  paused: 'warn',
  unhealthy: 'crit',
  restarting: 'crit',
  exited: 'crit',
  dead: 'crit',
};

/** The colour for a health word the engine reported. Anything unfamiliar is a warning. */
export const healthTone = (health: string): Tone => HEALTH[health] ?? 'warn';

export function usageTone(ratio: number): Tone {
  if (ratio >= 0.95) return 'crit';
  return ratio >= 0.8 ? 'warn' : 'signal';
}

const OUTCOMES: Record<ActivityOutcome, { label: string; tone: Tone }> = {
  ok: { label: 'ok', tone: 'ok' },
  refused: { label: 'refused', tone: 'warn' },
  error: { label: 'failed', tone: 'crit' },
  invalid: { label: 'bad request', tone: 'crit' },
};

export const describeOutcome = (outcome: ActivityOutcome): { label: string; tone: Tone } => OUTCOMES[outcome];

/** "nginx:1.30" from a registry path, and a short digest instead of a full one. */
export function shortImage(image: string): string {
  if (image.startsWith('sha256:')) return `image ${image.slice(7, 19)}`;
  return image.split('@')[0]?.split('/').slice(-2).join('/') ?? image;
}

const UNITS: Array<[number, string]> = [
  [86_400, 'd'],
  [3_600, 'h'],
  [60, 'min'],
];

/** "just now", "42 s ago", "3 min ago", "2 h ago". */
export function ago(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 5) return 'just now';
  const unit = UNITS.find(([size]) => seconds >= size);
  return unit ? `${Math.floor(seconds / unit[0])} ${unit[1]} ago` : `${seconds} s ago`;
}

const PROBLEMS: Record<string, string> = {
  unauthenticated: 'Your session has ended. Sign in again.',
  cross_site_request: 'The request was refused because it did not come from this site.',
  internal_error: 'The console service hit an unexpected error. Its container log has the detail.',
  request_failed: 'The console service did not answer. Is its container running?',
};

/** A sentence for a failed request to the console service. */
export function describeProblem(error: unknown): string {
  if (!(error instanceof ConsoleApiError)) return PROBLEMS.request_failed ?? '';
  if (error.code === 'invalid_params') return error.message;
  if (error.status === 429) return 'Too many requests at once. Wait a moment and try again.';
  if (error.status >= 502) return PROBLEMS.request_failed ?? '';
  return PROBLEMS[error.code] ?? `The console service answered ${error.status}.`;
}
