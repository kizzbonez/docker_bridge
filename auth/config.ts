import { DEFAULT_PARAMS, type ScryptParams } from './password.ts';

export type CookieSecure = 'auto' | 'always' | 'never';

export interface AuthConfig {
  host: string;
  port: number;
  /** Where the account state persists (a Docker volume in production). */
  dataDir: string;
  /** Optional preset for the one-time onboarding token; random when unset. */
  setupToken: string | null;
  /** Absolute session lifetime. */
  sessionTtlMs: number;
  /** A session unused for this long is dropped. */
  sessionIdleMs: number;
  cookieSecure: CookieSecure;
  /** Consecutive failures per client+account before the pair is locked. */
  maxFailures: number;
  lockoutMs: number;
  scrypt: ScryptParams;
}

type Env = Record<string, string | undefined>;

function positiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function cookieSecure(raw: string | undefined): CookieSecure {
  return raw === 'always' || raw === 'never' ? raw : 'auto';
}

const nonEmpty = (raw: string | undefined): string | null => (raw && raw.trim() !== '' ? raw.trim() : null);

export function loadConfig(env: Env): AuthConfig {
  return {
    host: env.AUTH_HOST ?? '0.0.0.0',
    port: positiveInt(env.AUTH_PORT, 8081),
    dataDir: env.AUTH_DATA_DIR ?? '/data',
    setupToken: nonEmpty(env.AUTH_SETUP_TOKEN),
    sessionTtlMs: positiveInt(env.AUTH_SESSION_TTL_HOURS, 12) * 3_600_000,
    sessionIdleMs: positiveInt(env.AUTH_SESSION_IDLE_MINUTES, 120) * 60_000,
    cookieSecure: cookieSecure(env.AUTH_COOKIE_SECURE),
    maxFailures: positiveInt(env.AUTH_MAX_FAILURES, 5),
    lockoutMs: positiveInt(env.AUTH_LOCKOUT_MINUTES, 15) * 60_000,
    scrypt: DEFAULT_PARAMS,
  };
}
