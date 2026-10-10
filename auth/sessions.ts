import { createHash, randomBytes } from 'node:crypto';

export interface ClientInfo {
  ip: string;
  userAgent: string;
}

export interface Session extends ClientInfo {
  /** Short public identifier, safe to show in the UI. Not the token. */
  id: string;
  user: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

export interface SessionStore {
  /** Returns the opaque token to hand to the browser. */
  create(user: string, client: ClientInfo): string;
  /** Looks the session up and marks it as just used. */
  touch(token: string): Session | null;
  list(user: string): Session[];
  revoke(token: string): void;
  revokeById(user: string, id: string): boolean;
  /** Ends every session of `user`, optionally sparing the one behind `exceptToken`. */
  revokeAll(user: string, exceptToken?: string): number;
}

interface Options {
  ttlMs: number;
  idleMs: number;
  maxSessions?: number;
  now?: () => number;
}

type Sessions = Map<string, Session>;

// Only a digest of each token is kept, so a memory dump does not yield usable cookies.
const digest = (token: string): string => createHash('sha256').update(token).digest('hex');

function removeWhere(sessions: Sessions, match: (key: string, session: Session) => boolean): number {
  let removed = 0;
  for (const [key, session] of sessions) {
    if (match(key, session) && sessions.delete(key)) removed += 1;
  }
  return removed;
}

/** Map iteration is insertion-ordered, so the first key is the oldest session. */
function evictOldest(sessions: Sessions, maxSessions: number): void {
  while (sessions.size >= maxSessions) {
    const oldest = sessions.keys().next().value;
    if (oldest === undefined) return;
    sessions.delete(oldest);
  }
}

/** In-memory sessions: 256-bit random tokens, absolute and idle expiry, revocable. */
export function createSessionStore({ ttlMs, idleMs, maxSessions = 200, now = Date.now }: Options): SessionStore {
  const sessions: Sessions = new Map();
  const alive = (session: Session): boolean => session.expiresAt > now() && now() - session.lastSeenAt < idleMs;

  return {
    create(user, client) {
      removeWhere(sessions, (_, session) => !alive(session));
      evictOldest(sessions, maxSessions);
      const token = randomBytes(32).toString('base64url');
      const time = now();
      const id = randomBytes(6).toString('hex');
      sessions.set(digest(token), { ...client, id, user, createdAt: time, lastSeenAt: time, expiresAt: time + ttlMs });
      return token;
    },
    touch(token) {
      const key = digest(token);
      const session = sessions.get(key);
      if (!session) return null;
      if (!alive(session)) {
        sessions.delete(key);
        return null;
      }
      session.lastSeenAt = now();
      return session;
    },
    list: (user) => [...sessions.values()].filter((session) => session.user === user && alive(session)),
    revoke: (token) => void sessions.delete(digest(token)),
    revokeById: (user, id) => removeWhere(sessions, (_, session) => session.user === user && session.id === id) > 0,
    revokeAll(user, exceptToken) {
      const keep = exceptToken === undefined ? null : digest(exceptToken);
      return removeWhere(sessions, (key, session) => session.user === user && key !== keep);
    },
  };
}
