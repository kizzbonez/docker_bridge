import type { IncomingMessage } from 'node:http';

/** The signed-in user behind a request, or null. */
export type SessionCheck = (req: IncomingMessage) => Promise<string | null>;

const VERIFY_TIMEOUT_MS = 3_000;
const FORWARDED = ['cookie', 'x-real-ip', 'x-forwarded-proto', 'user-agent'];

function headersOf(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of FORWARDED) {
    const value = req.headers[name];
    if (typeof value === 'string') headers[name] = value;
  }
  return headers;
}

/**
 * Asks the auth service whether the request carries a live session.
 *
 * nginx already asks before it forwards anything here. This service holds the
 * Docker socket, so it asks again for itself rather than trusting that every
 * request came through nginx. Any doubt (no cookie, a timeout, an odd answer)
 * counts as "not signed in".
 */
export function createSessionCheck(authUrl: string | null): SessionCheck {
  if (authUrl === null) return async () => 'development';
  return async (req) => {
    if (typeof req.headers.cookie !== 'string') return null;
    try {
      const response = await fetch(`${authUrl}/auth/verify`, { headers: headersOf(req), signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS) });
      if (response.status !== 200) return null;
      return response.headers.get('x-auth-user') || null;
    } catch {
      return null;
    }
  };
}
