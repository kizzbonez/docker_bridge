import { createAuditLog, type AuditLog } from './audit.ts';
import { createChallengeStore, type ChallengeStore } from './challenges.ts';
import { randomCode } from './codes.ts';
import type { AuthConfig } from './config.ts';
import { createLimiter, type Limiter } from './limiter.ts';
import { createSessionStore, type SessionStore } from './sessions.ts';
import { openStateStore, type StateStore } from './state.ts';

/** Onboarding state that only exists until the first account is created. */
export interface SetupGate {
  /** One-time token proving access to the server's logs. */
  token: string;
  /** The TOTP key being enrolled, held in memory until it is verified. */
  pending: { username: string; secret: string } | null;
}

/** Everything a request handler needs. Built once at start-up. */
export interface Context {
  config: AuthConfig;
  state: StateStore;
  sessions: SessionStore;
  challenges: ChallengeStore;
  limiter: Limiter;
  audit: AuditLog;
  setup: SetupGate;
  now: () => number;
  /** Runs credential checks one at a time: bounds scrypt memory and closes check-then-write races. */
  serial: <T>(task: () => Promise<T>) => Promise<T>;
}

interface Overrides {
  now?: () => number;
  sink?: (line: string) => void;
}

function createSerialQueue(): Context['serial'] {
  let tail: Promise<unknown> = Promise.resolve();
  return (task) => {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}

export async function createContext(config: AuthConfig, { now = Date.now, sink }: Overrides = {}): Promise<Context> {
  return {
    config,
    state: await openStateStore(config.dataDir),
    sessions: createSessionStore({ ttlMs: config.sessionTtlMs, idleMs: config.sessionIdleMs, now }),
    challenges: createChallengeStore({ now }),
    limiter: createLimiter({ maxFailures: config.maxFailures, lockoutMs: config.lockoutMs, now }),
    audit: createAuditLog({ now, sink }),
    setup: { token: config.setupToken ?? randomCode(4), pending: null },
    now,
    serial: createSerialQueue(),
  };
}
