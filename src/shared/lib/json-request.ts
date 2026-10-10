export interface JsonReply {
  ok: boolean;
  status: number;
  /** The parsed body; an empty object when there was none or it was not JSON. */
  data: unknown;
}

/**
 * A same-origin, cookie-carrying JSON request. An HTTP error is an answer,
 * not an exception: each API client decides what its own errors mean.
 */
export async function jsonRequest(method: 'GET' | 'POST', path: string, body?: object): Promise<JsonReply> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data: unknown = response.status === 204 ? undefined : await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}
