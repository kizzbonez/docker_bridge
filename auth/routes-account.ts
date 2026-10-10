import type { IncomingMessage, ServerResponse } from 'node:http';
import { generateRecoveryCodes } from './codes.ts';
import type { Context } from './context.ts';
import {
  recordFailure,
  redeemSecondFactor,
  requireAccount,
  requireNotLocked,
  requireSameSite,
  requireSession,
  type Authenticated,
} from './guards.ts';
import { HttpError, clientOf, field, readJson, sendJson } from './http.ts';
import { MAX_PASSWORD_LENGTH, passwordIssues } from './password-policy.ts';
import { hashPassword, verifyPassword } from './password.ts';

/** Sensitive changes need a fresh second factor even inside a valid session. */
async function requireSecondFactor(ctx: Context, auth: Authenticated, ip: string, code: string): Promise<void> {
  const key = `reauth|${ip}|${auth.account.username.toLowerCase()}`;
  requireNotLocked(ctx, key);
  if (!(await redeemSecondFactor(ctx, code))) {
    recordFailure(ctx, key, ip, 'second_factor_failure', auth.account.username);
    throw new HttpError(401, 'invalid_code');
  }
  ctx.limiter.succeed(key);
}

export async function overview(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  const { session, account } = requireSession(req, ctx);
  sendJson(res, 200, {
    user: account.username,
    createdAt: account.createdAt,
    passwordChangedAt: account.passwordChangedAt,
    recoveryCodesLeft: account.recoveryHashes.length,
    sessions: ctx.sessions.list(account.username).map((entry) => ({
      id: entry.id,
      current: entry.id === session.id,
      createdAt: new Date(entry.createdAt).toISOString(),
      lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
      ip: entry.ip,
      userAgent: entry.userAgent,
    })),
    events: ctx.audit.recent(),
  });
}

export async function revokeSession(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const { account } = requireSession(req, ctx);
  const id = field(await readJson(req), 'id', 32);
  if (!ctx.sessions.revokeById(account.username, id)) throw new HttpError(404, 'session_not_found');
  ctx.audit.record('session_revoked', clientOf(req).ip, id);
  sendJson(res, 204, null);
}

/** "Sign out everywhere else". */
export async function revokeOthers(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const { token, account } = requireSession(req, ctx);
  const revoked = ctx.sessions.revokeAll(account.username, token);
  ctx.audit.record('sessions_revoked', clientOf(req).ip, `${revoked} other session(s)`);
  sendJson(res, 200, { revoked });
}

export async function changePassword(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const auth = requireSession(req, ctx);
  const body = await readJson(req);
  const current = field(body, 'currentPassword', MAX_PASSWORD_LENGTH);
  const next = field(body, 'newPassword', MAX_PASSWORD_LENGTH);
  const code = field(body, 'code', 32);
  const { ip } = clientOf(req);

  const issues = passwordIssues(next, auth.account.username);
  if (issues.length > 0) throw new HttpError(400, 'weak_password', { issues });
  const key = `reauth|${ip}|${auth.account.username.toLowerCase()}`;
  requireNotLocked(ctx, key);
  if (!(await ctx.serial(() => verifyPassword(current, auth.account.passwordHash)))) {
    recordFailure(ctx, key, ip, 'login_failure', auth.account.username);
    throw new HttpError(401, 'invalid_credentials');
  }
  await requireSecondFactor(ctx, auth, ip, code);

  const passwordHash = await ctx.serial(() => hashPassword(next, ctx.config.scrypt));
  await ctx.state.save({ ...requireAccount(ctx), passwordHash, passwordChangedAt: new Date(ctx.now()).toISOString() });
  // Anyone holding an older session must sign in again with the new password.
  ctx.sessions.revokeAll(auth.account.username, auth.token);
  ctx.audit.record('password_changed', ip, auth.account.username);
  sendJson(res, 204, null);
}

export async function regenerateRecoveryCodes(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  requireSameSite(req);
  const auth = requireSession(req, ctx);
  const code = field(await readJson(req), 'code', 32);
  const { ip } = clientOf(req);
  await requireSecondFactor(ctx, auth, ip, code);

  const { codes, hashes } = generateRecoveryCodes();
  await ctx.state.save({ ...requireAccount(ctx), recoveryHashes: hashes });
  ctx.audit.record('recovery_codes_regenerated', ip, auth.account.username);
  sendJson(res, 200, { recoveryCodes: codes });
}
