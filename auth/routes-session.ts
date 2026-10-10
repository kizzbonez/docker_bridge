import type { IncomingMessage, ServerResponse } from 'node:http';
import { sameSecret } from './codes.ts';
import type { Context } from './context.ts';
import {
  clearedCookie,
  currentSession,
  recordFailure,
  redeemSecondFactor,
  requireAccount,
  requireNotLocked,
  requireSameSite,
  startSession,
} from './guards.ts';
import { HttpError, clientOf, field, readJson, sendJson, sessionToken } from './http.ts';
import { MAX_PASSWORD_LENGTH } from './password-policy.ts';
import { verifyPassword } from './password.ts';

const loginKey = (ip: string, username: string): string => `login|${ip}|${username.toLowerCase()}`;

/** Public: lets the portal decide between onboarding, sign-in and "already in". */
export async function status(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  const authenticated = currentSession(req, ctx);
  sendJson(res, 200, {
    setupRequired: ctx.state.account() === null,
    authenticated: authenticated !== null,
    user: authenticated?.session.user ?? null,
  });
}

/** Internal: nginx asks this before serving any protected file. */
export async function verify(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  const authenticated = currentSession(req, ctx);
  if (!authenticated) throw new HttpError(401, 'unauthenticated');
  sendJson(res, 200, { user: authenticated.session.user }, { 'X-Auth-User': authenticated.session.user });
}

/** Step one: username and password. Success yields a challenge, not a session. */
export async function login(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const account = requireAccount(ctx);
  const body = await readJson(req);
  const username = field(body, 'username', 64);
  const password = field(body, 'password', MAX_PASSWORD_LENGTH);
  const { ip } = clientOf(req);
  const key = loginKey(ip, username);
  requireNotLocked(ctx, key);

  // The hash is always computed, so an unknown username costs the same time as a wrong password.
  const passwordOk = await ctx.serial(() => verifyPassword(password, account.passwordHash));
  const usernameOk = sameSecret(username.toLowerCase(), account.username.toLowerCase());
  if (!passwordOk || !usernameOk) {
    recordFailure(ctx, key, ip, 'login_failure', username);
    throw new HttpError(401, 'invalid_credentials');
  }
  sendJson(res, 200, { next: 'second_factor', challenge: ctx.challenges.issue({ user: account.username, ip }) });
}

/** Step two: an authenticator code or a recovery code redeems the challenge. */
export async function loginVerify(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const account = requireAccount(ctx);
  const body = await readJson(req);
  const token = field(body, 'challenge', 128);
  const code = field(body, 'code', 32);
  const { ip } = clientOf(req);
  const key = `second|${ip}|${account.username.toLowerCase()}`;
  requireNotLocked(ctx, key);

  const challenge = ctx.challenges.attempt(token);
  if (!challenge || challenge.ip !== ip) throw new HttpError(401, 'challenge_expired');
  const redeemed = await redeemSecondFactor(ctx, code);
  if (!redeemed) {
    recordFailure(ctx, key, ip, 'second_factor_failure', account.username);
    throw new HttpError(401, 'invalid_code');
  }

  ctx.challenges.consume(token);
  ctx.limiter.succeed(key);
  ctx.limiter.succeed(loginKey(ip, account.username));
  if (redeemed.recovery) ctx.audit.record('recovery_code_used', ip, account.username);
  ctx.audit.record('login_success', ip, account.username);
  const recoveryCodesLeft = requireAccount(ctx).recoveryHashes.length;
  startSession(req, res, ctx, account.username, { usedRecoveryCode: redeemed.recovery, recoveryCodesLeft });
}

export async function logout(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const token = sessionToken(req);
  if (token && ctx.sessions.touch(token)) {
    ctx.sessions.revoke(token);
    ctx.audit.record('logout', clientOf(req).ip);
  }
  sendJson(res, 204, null, { 'Set-Cookie': clearedCookie(req, ctx) });
}
