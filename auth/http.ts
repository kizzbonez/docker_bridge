import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { ClientInfo } from './sessions.ts';

export const SESSION_COOKIE = 'db_session';
const MAX_BODY_BYTES = 4096;

/** An error that maps straight to an HTTP response. */
export class HttpError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, error: string, extra: Record<string, unknown> = {}) {
    super(error);
    this.status = status;
    this.body = { error, ...extra };
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const payload = status === 204 ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(payload);
}

const header = (req: IncomingMessage, name: string): string => {
  const value = req.headers[name];
  return typeof value === 'string' ? value : '';
};

/** nginx sets X-Real-IP from the socket address; the service is not reachable any other way. */
export function clientOf(req: IncomingMessage): ClientInfo {
  return {
    ip: header(req, 'x-real-ip') || req.socket.remoteAddress || 'unknown',
    userAgent: header(req, 'user-agent').slice(0, 200),
  };
}

export function sessionToken(req: IncomingMessage): string | null {
  for (const part of header(req, 'cookie').split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === SESSION_COOKIE) return value.join('=') || null;
  }
  return null;
}

/**
 * CSRF defence for state-changing requests. Browsers always send
 * Sec-Fetch-Site or Origin on a cross-site POST; clients that send neither
 * (curl, scanners) carry no ambient cookies worth protecting.
 */
export function isCrossSite(req: IncomingMessage): boolean {
  const site = header(req, 'sec-fetch-site');
  if (site) return site !== 'same-origin' && site !== 'none';
  const origin = header(req, 'origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== header(req, 'host');
  } catch {
    return true;
  }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Parses a small JSON object body, insisting on the JSON content type. */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!header(req, 'content-type').toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'json_required');
  }
  const raw = await readBody(req);
  try {
    const parsed: unknown = raw === '' ? {} : JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // fall through to the shared error
  }
  throw new HttpError(400, 'invalid_json');
}

/** A string field of bounded length, or a 400. */
export function field(body: Record<string, unknown>, name: string, maxLength: number): string {
  const value = body[name];
  if (typeof value !== 'string' || value === '' || value.length > maxLength) throw new HttpError(400, 'invalid_request', { field: name });
  return value;
}

/** Answers a thrown error: an HttpError as itself, anything else as an opaque 500. */
export function sendFailure(res: ServerResponse, error: unknown): void {
  if (res.headersSent) return void res.end();
  if (error instanceof HttpError) {
    const retryAfter = error.body.retryAfter;
    const headers: Record<string, string> = typeof retryAfter === 'number' ? { 'Retry-After': String(retryAfter) } : {};
    return sendJson(res, error.status, error.body, headers);
  }
  console.error(JSON.stringify({ level: 'error', message: error instanceof Error ? error.message : 'unknown error' }));
  sendJson(res, 500, { error: 'internal_error' });
}

/** Stops accepting connections on SIGTERM or SIGINT, then exits. */
export function closeOnSignal(server: Server): void {
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      // Do not let a stuck connection block shutdown.
      setTimeout(() => process.exit(0), 3_000).unref();
    });
  }
}

/** Slow or oversized requests are cut off rather than held open. */
export function harden(server: Server): Server {
  server.headersTimeout = 5_000;
  server.requestTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 50;
  return server;
}
