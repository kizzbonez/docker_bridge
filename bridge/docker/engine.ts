import { request } from 'node:http';
import { ToolError } from '../errors.ts';

// An old, stable API version: everything used here exists since Docker 20.10.
const API_PREFIX = '/v1.41';

export interface EngineResponse {
  status: number;
  body: Buffer;
  /** The body was cut off at `maxBytes`. */
  truncated: boolean;
  /** The deadline passed before the engine finished; `body` holds what had arrived. */
  timedOut: boolean;
}

export interface RequestOptions {
  body?: unknown;
  timeoutMs?: number;
  maxBytes?: number;
}

type Method = 'GET' | 'POST';

export interface Engine {
  send(method: Method, path: string, options?: RequestOptions): Promise<EngineResponse>;
}

export interface EngineDefaults {
  timeoutMs: number;
  maxBytes: number;
}

function unreachable(socketPath: string, error: NodeJS.ErrnoException): ToolError {
  const hint = error.code === 'EACCES' || error.code === 'EPERM' ? 'permission denied' : 'is Docker running?';
  return new ToolError(`cannot reach the Docker Engine at ${socketPath} (${error.code ?? error.message}): ${hint}`);
}

/** Accumulates a response body, keeping at most `maxBytes`. */
function createCollector(maxBytes: number) {
  const chunks: Buffer[] = [];
  let size = 0;
  return {
    /** Adds a chunk; returns true once the limit has been passed. */
    add(chunk: Buffer): boolean {
      const room = maxBytes - size;
      size += chunk.length;
      if (room > 0) chunks.push(chunk.length > room ? chunk.subarray(0, room) : chunk);
      return size > maxBytes;
    },
    body: (): Buffer => Buffer.concat(chunks),
  };
}

function headersFor(payload: string | null): Record<string, string | number> {
  const headers: Record<string, string | number> = { Host: 'docker' };
  if (payload === null) return headers;
  return { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
}

/**
 * One request, bounded in time and size. A deadline or a size limit resolves
 * with whatever had arrived rather than throwing, so a slow exec still
 * reports its partial output. Only a failure to connect rejects.
 */
function sendRequest(socketPath: string, limits: EngineDefaults, method: Method, path: string, body: unknown): Promise<EngineResponse> {
  const payload = body === undefined ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const collector = createCollector(limits.maxBytes);
    let status = 0;
    let settled = false;
    const finish = (flags: { truncated?: boolean; timedOut?: boolean } | NodeJS.ErrnoException): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (flags instanceof Error) return reject(unreachable(socketPath, flags));
      resolve({ status, body: collector.body(), truncated: flags.truncated ?? false, timedOut: flags.timedOut ?? false });
    };

    const req = request({ socketPath, method, path: API_PREFIX + path, headers: headersFor(payload) }, (res) => {
      status = res.statusCode ?? 0;
      res.on('data', (chunk: Buffer) => {
        if (!collector.add(chunk)) return;
        finish({ truncated: true });
        res.destroy();
      });
      res.on('end', () => finish({}));
      res.on('close', () => finish({}));
    });
    const timer = setTimeout(() => {
      finish({ timedOut: true });
      req.destroy();
    }, limits.timeoutMs);
    req.on('error', finish);
    req.end(payload ?? undefined);
  });
}

/** A minimal Docker Engine API client over a unix socket or Windows named pipe. */
export function createEngine(socketPath: string, defaults: EngineDefaults): Engine {
  return {
    send(method, path, options = {}) {
      const limits = { timeoutMs: options.timeoutMs ?? defaults.timeoutMs, maxBytes: options.maxBytes ?? defaults.maxBytes };
      return sendRequest(socketPath, limits, method, path, options.body);
    },
  };
}

export function messageOf(response: EngineResponse): string {
  const raw = response.body.toString('utf8');
  try {
    const message = (JSON.parse(raw) as { message?: unknown } | null)?.message;
    if (typeof message === 'string') return message;
  } catch {
    // not JSON: fall through to the raw text
  }
  return raw.slice(0, 300) || `HTTP ${response.status}`;
}

/** Sends a request and parses a JSON answer, turning engine errors into ToolErrors. */
export async function callJson<T>(engine: Engine, method: Method, path: string, options?: RequestOptions): Promise<T> {
  const response = await engine.send(method, path, options);
  if (response.timedOut) throw new ToolError('the Docker Engine did not answer in time');
  if (response.status >= 400) throw new ToolError(`Docker Engine: ${messageOf(response)}`);
  try {
    return JSON.parse(response.body.toString('utf8')) as T;
  } catch {
    throw new ToolError('the Docker Engine returned an unreadable response');
  }
}
