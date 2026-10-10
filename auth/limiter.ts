export interface Limiter {
  /** Seconds the key must still wait; 0 when it may try. */
  retryAfter(key: string): number;
  fail(key: string): void;
  succeed(key: string): void;
}

interface Options {
  maxFailures: number;
  lockoutMs: number;
  /** Upper bound on tracked keys, so an attacker cannot grow the map without limit. */
  maxKeys?: number;
  now?: () => number;
}

interface Entry {
  failures: number;
  lockedUntil: number;
  lastFailure: number;
}

/**
 * Brute-force brake: after `maxFailures` consecutive failures a key is locked
 * for `lockoutMs`. A success clears the count; so does a quiet lockout period.
 */
export function createLimiter({ maxFailures, lockoutMs, maxKeys = 10_000, now = Date.now }: Options): Limiter {
  const entries = new Map<string, Entry>();

  function evict(): void {
    const time = now();
    for (const [key, entry] of entries) {
      if (entry.lockedUntil <= time && time - entry.lastFailure > lockoutMs) entries.delete(key);
    }
    while (entries.size >= maxKeys) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  return {
    retryAfter(key) {
      const entry = entries.get(key);
      if (!entry) return 0;
      return Math.max(0, Math.ceil((entry.lockedUntil - now()) / 1000));
    },
    fail(key) {
      const time = now();
      const previous = entries.get(key);
      // A failure long after the last one starts a fresh run.
      const stale = previous !== undefined && time - previous.lastFailure > lockoutMs;
      const failures = (stale || !previous ? 0 : previous.failures) + 1;
      if (!previous) evict();
      const lockedUntil = failures >= maxFailures ? time + lockoutMs : 0;
      entries.delete(key);
      entries.set(key, { failures: lockedUntil ? 0 : failures, lockedUntil, lastFailure: time });
    },
    succeed(key) {
      entries.delete(key);
    },
  };
}
