import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Context } from './context.ts';
import { harden, sendFailure, sendJson } from './http.ts';
import { changePassword, overview, regenerateRecoveryCodes, revokeOthers, revokeSession } from './routes-account.ts';
import { login, loginVerify, logout, status, verify } from './routes-session.ts';
import { setupComplete, setupToken, setupTotp } from './routes-setup.ts';

type Handler = (req: IncomingMessage, res: ServerResponse, ctx: Context) => Promise<void>;

const health: Handler = async (_req, res) => sendJson(res, 200, { ok: true });

/** Every route the service answers. Anything else is a 404. */
const ROUTES: Record<string, Handler> = {
  'GET /auth/healthz': health,
  'GET /auth/status': status,
  'GET /auth/verify': verify,
  'POST /auth/login': login,
  'POST /auth/login/verify': loginVerify,
  'POST /auth/logout': logout,
  'POST /auth/setup/token': setupToken,
  'POST /auth/setup/totp': setupTotp,
  'POST /auth/setup/complete': setupComplete,
  'GET /auth/account': overview,
  'POST /auth/account/sessions/revoke': revokeSession,
  'POST /auth/account/sessions/revoke-others': revokeOthers,
  'POST /auth/account/password': changePassword,
  'POST /auth/account/recovery-codes': regenerateRecoveryCodes,
};

export function createApp(ctx: Context): Server {
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    const handler = ROUTES[`${req.method} ${path}`];
    if (!handler) return sendJson(res, 404, { error: 'not_found' });
    handler(req, res, ctx).catch((error: unknown) => sendFailure(res, error));
  });
  return harden(server);
}
