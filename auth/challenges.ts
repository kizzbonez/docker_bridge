import { createHash, randomBytes } from 'node:crypto';

export interface Challenge {
  user: string;
  ip: string;
}

export interface ChallengeStore {
  /** Issued after a correct password; redeemed with a second factor. */
  issue(challenge: Challenge): string;
  /** Counts one second-factor attempt. Null once expired or out of attempts. */
  attempt(token: string): Challenge | null;
  consume(token: string): void;
}

interface Options {
  ttlMs?: number;
  maxAttempts?: number;
  maxPending?: number;
  now?: () => number;
}

interface Entry extends Challenge {
  expiresAt: number;
  attemptsLeft: number;
}

const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

/**
 * The gap between "password accepted" and "signed in". A challenge is short
 * lived and allows only a few guesses, so the 6-digit code cannot be brute
 * forced against it.
 */
export function createChallengeStore(options: Options = {}): ChallengeStore {
  const { ttlMs = 5 * 60_000, maxAttempts = 5, maxPending = 500, now = Date.now } = options;
  const pending = new Map<string, Entry>();

  function prune(): void {
    for (const [key, entry] of pending) {
      if (entry.expiresAt <= now()) pending.delete(key);
    }
    while (pending.size >= maxPending) {
      const oldest = pending.keys().next().value;
      if (oldest === undefined) break;
      pending.delete(oldest);
    }
  }

  return {
    issue(challenge) {
      prune();
      const token = randomBytes(32).toString('base64url');
      pending.set(digest(token), { ...challenge, expiresAt: now() + ttlMs, attemptsLeft: maxAttempts });
      return token;
    },
    attempt(token) {
      const key = digest(token);
      const entry = pending.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now() || entry.attemptsLeft <= 0) {
        pending.delete(key);
        return null;
      }
      entry.attemptsLeft -= 1;
      return { user: entry.user, ip: entry.ip };
    },
    consume: (token) => void pending.delete(digest(token)),
  };
}
