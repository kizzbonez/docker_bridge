import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuditType } from './audit.ts';
import { consumeRecoveryCode } from './codes.ts';
import type { Context } from './context.ts';
import { HttpError, SESSION_COOKIE, clientOf, isCrossSite, sendJson, sessionToken } from './http.ts';
import type { Session } from './sessions.ts';
import type { Account } from './state.ts';
import { verifyTotp } from './totp.ts';

export function requireSameSite(req: IncomingMessage): void {
  if (isCrossSite(req)) throw new HttpError(403, 'cross_site_request');
}

export function requireAccount(ctx: Context): Account {
  const account = ctx.state.account();
  if (!account) throw new HttpError(409, 'setup_required');
  return account;
}

export function requireNotLocked(ctx: Context, key: string): void {
  const retryAfter = ctx.limiter.retryAfter(key);
  if (retryAfter > 0) throw new HttpError(429, 'locked', { retryAfter });
}

/** Counts a failure, records it, and notes the moment a key becomes locked. */
export function recordFailure(ctx: Context, key: string, ip: string, type: AuditType, detail = ''): void {
  ctx.limiter.fail(key);
  ctx.audit.record(type, ip, detail);
  if (ctx.limiter.retryAfter(key) > 0) ctx.audit.record('lockout', ip, detail);
}

export interface Authenticated {
  token: string;
  session: Session;
  account: Account;
}

export function currentSession(req: IncomingMessage, ctx: Context): Authenticated | null {
  const token = sessionToken(req);
  const account = ctx.state.account();
  const session = token ? ctx.sessions.touch(token) : null;
  return token && session && account && session.user === account.username ? { token, session, account } : null;
}

export function requireSession(req: IncomingMessage, ctx: Context): Authenticated {
  const authenticated = currentSession(req, ctx);
  if (!authenticated) throw new HttpError(401, 'unauthenticated');
  return authenticated;
}

function cookie(req: IncomingMessage, ctx: Context, value: string, maxAgeSeconds: number): string {
  const https = req.headers['x-forwarded-proto'] === 'https';
  const secure = ctx.config.cookieSecure === 'always' || (ctx.config.cookieSecure === 'auto' && https);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

export const clearedCookie = (req: IncomingMessage, ctx: Context): string => cookie(req, ctx, '', 0);

/** Issues a fresh session (never reuses a pre-login token) and answers 200. */
export function startSession(req: IncomingMessage, res: ServerResponse, ctx: Context, user: string, extra: object = {}): void {
  const token = ctx.sessions.create(user, clientOf(req));
  const maxAge = Math.floor(ctx.config.sessionTtlMs / 1000);
  sendJson(res, 200, { user, ...extra }, { 'Set-Cookie': cookie(req, ctx, token, maxAge) });
}

/**
 * Spends a second factor: a TOTP code, or failing that a recovery code.
 * Serialized and re-reads the account, so one code can never be accepted twice.
 */
export function redeemSecondFactor(ctx: Context, code: string): Promise<{ recovery: boolean } | null> {
  return ctx.serial(async () => {
    const account = requireAccount(ctx);
    const counter = verifyTotp(account.totpSecret, code.trim(), ctx.now(), account.totpLastCounter);
    if (counter !== null) {
      await ctx.state.save({ ...account, totpLastCounter: counter });
      return { recovery: false };
    }
    const remaining = consumeRecoveryCode(account.recoveryHashes, code);
    if (!remaining) return null;
    await ctx.state.save({ ...account, recoveryHashes: remaining });
    return { recovery: true };
  });
}
