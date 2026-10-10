import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { parseError, type Dispatch, type JsonRpcResponse } from './protocol.ts';

/** A JSON-RPC message never needs to be larger than this; longer lines are refused. */
const MAX_LINE_CHARS = 1_000_000;

/** One message, or (for older clients) a batch of them. */
async function answer(dispatch: Dispatch, message: unknown): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (!Array.isArray(message)) return dispatch(message);
  const replies = (await Promise.all(message.map(dispatch))).filter((reply) => reply !== null);
  return replies.length > 0 ? replies : null;
}

function parse(line: string): { ok: true; message: unknown } | { ok: false } {
  if (line.length > MAX_LINE_CHARS) return { ok: false };
  try {
    return { ok: true, message: JSON.parse(line) };
  } catch {
    return { ok: false };
  }
}

/**
 * The MCP stdio transport: one JSON-RPC message per line in, one per line
 * out. Requests are handled concurrently, so a slow tool call does not hold
 * up a ping. Resolves when the input ends and every reply has been written.
 */
export function serveStdio(dispatch: Dispatch, input: Readable, output: Writable): Promise<void> {
  const pending = new Set<Promise<void>>();
  const write = (reply: JsonRpcResponse | JsonRpcResponse[] | null): void => {
    if (reply !== null) output.write(`${JSON.stringify(reply)}\n`);
  };

  const lines = createInterface({ input, crlfDelay: Infinity });
  lines.on('line', (raw) => {
    const line = raw.trim();
    if (line === '') return;
    const parsed = parse(line);
    if (!parsed.ok) return write(parseError());
    const task = answer(dispatch, parsed.message)
      .then(write)
      .finally(() => pending.delete(task));
    pending.add(task);
  });

  return new Promise((resolve) => {
    lines.on('close', () => void Promise.allSettled([...pending]).then(() => resolve()));
  });
}
