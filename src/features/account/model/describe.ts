import type { Tone } from '@/shared/lib/tone';

const BROWSERS: Array<[RegExp, string]> = [
  [/Edg\//, 'Edge'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: Array<[RegExp, string]> = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
];

const first = (table: Array<[RegExp, string]>, text: string): string | undefined => table.find(([pattern]) => pattern.test(text))?.[1];

/** "Chrome on Windows" from a User-Agent header; the raw string as a last resort. */
export function describeAgent(userAgent: string): string {
  const browser = first(BROWSERS, userAgent);
  const system = first(SYSTEMS, userAgent);
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? (userAgent.slice(0, 40) || 'Unknown device');
}

const EVENTS: Record<string, { label: string; tone: Tone }> = {
  setup_completed: { label: 'Setup completed', tone: 'ok' },
  setup_token_rejected: { label: 'Setup token rejected', tone: 'crit' },
  login_success: { label: 'Signed in', tone: 'ok' },
  login_failure: { label: 'Failed sign-in', tone: 'warn' },
  second_factor_failure: { label: 'Wrong second factor', tone: 'warn' },
  recovery_code_used: { label: 'Recovery code used', tone: 'warn' },
  lockout: { label: 'Locked out', tone: 'crit' },
  logout: { label: 'Signed out', tone: 'mute' },
  session_revoked: { label: 'Session revoked', tone: 'signal' },
  sessions_revoked: { label: 'Other sessions revoked', tone: 'signal' },
  password_changed: { label: 'Password changed', tone: 'signal' },
  recovery_codes_regenerated: { label: 'Recovery codes regenerated', tone: 'signal' },
};

export function describeEvent(type: string): { label: string; tone: Tone } {
  return EVENTS[type] ?? { label: type, tone: 'mute' };
}

const DATE_TIME = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME.format(date);
}
