import { vi } from 'vitest';

interface Reply {
  status?: number;
  body?: unknown;
}

type Route = Reply | ((body: Record<string, unknown>) => Reply);

export interface Call {
  key: string;
  body: Record<string, unknown>;
}

/**
 * Replaces fetch with a table of canned auth-service answers, keyed by
 * "METHOD /path". Returns the list of calls made, for assertions.
 */
export function mockFetch(routes: Record<string, Route>): Call[] {
  const calls: Call[] = [];
  const handler = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const key = `${init.method ?? 'GET'} ${url}`;
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ key, body });
    const route = routes[key];
    if (!route) throw new Error(`unexpected request: ${key}`);
    const { status = 200, body: payload = {} } = typeof route === 'function' ? route(body) : route;
    return new Response(status === 204 ? null : JSON.stringify(payload), { status });
  };
  vi.stubGlobal('fetch', vi.fn(handler));
  return calls;
}
