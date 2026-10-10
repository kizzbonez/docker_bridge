import type { IncomingMessage, ServerResponse } from 'node:http';
import { generateRecoveryCodes, normalizeCode, sameSecret } from './codes.ts';
import type { Context } from './context.ts';
import { recordFailure, requireNotLocked, requireSameSite, startSession } from './guards.ts';
import { HttpError, clientOf, field, readJson, sendJson } from './http.ts';
import { MAX_PASSWORD_LENGTH, USERNAME_PATTERN, passwordIssues } from './password-policy.ts';
import { hashPassword } from './password.ts';
import { generateSecret, otpauthUri, verifyTotp } from './totp.ts';

export const ISSUER = 'DockerBridge';

function requireSetupOpen(ctx: Context): void {
  if (ctx.state.account()) throw new HttpError(409, 'already_configured');
}

/** Every onboarding call must carry the token from the server's logs. */
function requireSetupToken(req: IncomingMessage, ctx: Context, body: Record<string, unknown>): void {
  const { ip } = clientOf(req);
  const key = `setup|${ip}`;
  requireNotLocked(ctx, key);
  const token = field(body, 'token', 64);
  if (!sameSecret(normalizeCode(token), normalizeCode(ctx.setup.token))) {
    recordFailure(ctx, key, ip, 'setup_token_rejected');
    throw new HttpError(403, 'invalid_token');
  }
}

function usernameOf(body: Record<string, unknown>): string {
  const username = field(body, 'username', 32);
  if (!USERNAME_PATTERN.test(username)) throw new HttpError(400, 'invalid_username');
  return username;
}

async function open(req: IncomingMessage, ctx: Context): Promise<Record<string, unknown>> {
  requireSameSite(req);
  requireSetupOpen(ctx);
  const body = await readJson(req);
  requireSetupToken(req, ctx, body);
  return body;
}

/** Step 1: is this the right setup token? */
export async function setupToken(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  await open(req, ctx);
  sendJson(res, 204, null);
}

/** Step 2: hand the browser a fresh TOTP key to show as a QR code. */
export async function setupTotp(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  const body = await open(req, ctx);
  const username = usernameOf(body);
  const secret = generateSecret();
  ctx.setup.pending = { username, secret };
  sendJson(res, 200, { secret, uri: otpauthUri(ISSUER, username, secret) });
}

/** Step 3: prove the authenticator works, create the account, sign in. */
export async function setupComplete(req: IncomingMessage, res: ServerResponse, ctx: Context): Promise<void> {
  const body = await open(req, ctx);
  const username = usernameOf(body);
  const password = field(body, 'password', MAX_PASSWORD_LENGTH);
  const code = field(body, 'code', 16);
  const issues = passwordIssues(password, username);
  if (issues.length > 0) throw new HttpError(400, 'weak_password', { issues });

  const recoveryCodes = await ctx.serial(async () => {
    requireSetupOpen(ctx);
    const pending = ctx.setup.pending;
    if (!pending || pending.username !== username) throw new HttpError(409, 'enrollment_not_started');
    const counter = verifyTotp(pending.secret, code.trim(), ctx.now(), -1);
    if (counter === null) throw new HttpError(401, 'invalid_code');

    const { codes, hashes } = generateRecoveryCodes();
    const at = new Date(ctx.now()).toISOString();
    await ctx.state.save({
      username,
      passwordHash: await hashPassword(password, ctx.config.scrypt),
      totpSecret: pending.secret,
      totpLastCounter: counter,
      recoveryHashes: hashes,
      createdAt: at,
      passwordChangedAt: at,
    });
    ctx.setup.pending = null;
    return codes;
  });

  ctx.audit.record('setup_completed', clientOf(req).ip, username);
  startSession(req, res, ctx, username, { recoveryCodes });
}
