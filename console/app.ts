import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { HttpError, harden, isCrossSite, readJson, sendFailure, sendJson } from '../auth/http.ts';
import type { ConsoleContext } from './context.ts';
import { engineSummary } from './engine-summary.ts';
import { toolsCall } from './tool-calls.ts';

type Handler = (req: IncomingMessage, ctx: ConsoleContext) => Promise<unknown>;

/** Every route needs a session, checked here as well as by nginx in front. */
function signedIn(handler: Handler): Handler {
  return async (req, ctx) => {
    if ((await ctx.session(req)) === null) throw new HttpError(401, 'unauthenticated');
    return handler(req, ctx);
  };
}

/** A state-changing route: refused when the browser says the request came from another site. */
function sameSite(handler: Handler): Handler {
  return async (req, ctx) => {
    if (isCrossSite(req)) throw new HttpError(403, 'cross_site_request');
    return handler(req, ctx);
  };
}

/** Every route the service answers. Anything else is a 404. */
const ROUTES: Record<string, Handler> = {
  // For the container health check only; nginx never forwards it without a session.
  'GET /api/healthz': async () => ({ ok: true }),
  'GET /api/engine': signedIn((_req, ctx) => engineSummary(ctx)),
  'GET /api/activity': signedIn((_req, ctx) => ctx.activity.read()),
  'POST /api/tools/call': sameSite(signedIn(async (req, ctx) => toolsCall(ctx, await readJson(req)))),
};

/** The live console's API: the bridge's three tools over HTTP, for the signed-in administrator. */
export function createApp(ctx: ConsoleContext): Server {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? '/').split('?')[0];
    const handler = ROUTES[`${req.method} ${path}`];
    if (!handler) return sendJson(res, 404, { error: 'not_found' });
    handler(req, ctx).then(
      (body) => sendJson(res, 200, body),
      (error: unknown) => sendFailure(res, error),
    );
  });
  return harden(server);
}
