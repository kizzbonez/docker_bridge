import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** A container as the fake engine holds it. */
export interface FakeContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  labels: Record<string, string>;
  inspect?: Record<string, unknown>;
  /** Log lines; entries prefixed "ERR:" are sent on stderr. */
  log?: string[];
  /** What an exec of a given argv produces. */
  exec?: (argv: string[]) => { stdout?: string; stderr?: string; exitCode?: number; delayMs?: number; startError?: string };
}

export interface FakeEngine {
  socketPath: string;
  /** Every request the engine received, in order. */
  requests: string[];
  /** Every argv handed to an exec. */
  execs: string[][];
  /** Every JSON body posted, in order. */
  bodies: Array<Record<string, unknown>>;
  close(): Promise<void>;
}

interface PendingExec {
  container: FakeContainer;
  argv: string[];
  exitCode: number | null;
}

/** What `GET /info` answers. */
export const ENGINE_INFO = { ServerVersion: '29.8.0', OperatingSystem: 'Docker Desktop', NCPU: 12, MemTotal: 16 * 1024 * 1048576 };

const STATS = {
  cpu_stats: { cpu_usage: { total_usage: 400 }, system_cpu_usage: 2000, online_cpus: 2 },
  precpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 1000 },
  memory_stats: { usage: 220 * 1048576, stats: { inactive_file: 20 * 1048576 } },
};

/** One frame of Docker's multiplexed stream. */
export function frame(stream: 1 | 2, text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const header = Buffer.alloc(8);
  header[0] = stream;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

/** A 64-character hex id derived from a readable seed. */
export const containerId = (seed: string): string => Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64);

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return chunks.length > 0 ? (JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>) : {};
}

function logBody(container: FakeContainer, tail: number): Buffer {
  const lines = (container.log ?? []).slice(-tail);
  return Buffer.concat(lines.map((line) => (line.startsWith('ERR:') ? frame(2, `${line.slice(4)}\n`) : frame(1, `${line}\n`))));
}

function runExec(entry: PendingExec | undefined, action: string, res: ServerResponse): void {
  if (!entry) return json(res, 404, { message: 'No such exec instance' });
  if (action === 'json') return json(res, 200, { ExitCode: entry.exitCode, Running: entry.exitCode === null });
  const outcome = entry.container.exec?.(entry.argv) ?? {};
  if (outcome.startError) return json(res, 400, { message: outcome.startError });
  res.writeHead(200, { 'Content-Type': 'application/vnd.docker.multiplexed-stream' });
  setTimeout(() => {
    entry.exitCode = outcome.exitCode ?? 0;
    res.end(Buffer.concat([frame(1, outcome.stdout ?? ''), frame(2, outcome.stderr ?? '')]));
  }, outcome.delayMs ?? 0);
}

/**
 * A stand-in for the Docker Engine API, listening on a real named pipe or
 * unix socket, so tests drive the actual HTTP client rather than a mock of it.
 */
export async function startFakeEngine(containers: FakeContainer[]): Promise<FakeEngine> {
  const name = `dockerbridge-test-${process.pid}-${randomBytes(6).toString('hex')}`;
  const socketPath = process.platform === 'win32' ? `//./pipe/${name}` : join(tmpdir(), `${name}.sock`);
  const requests: string[] = [];
  const execs: string[][] = [];
  const bodies: Array<Record<string, unknown>> = [];
  const pending = new Map<string, PendingExec>();

  async function containerRoute(req: IncomingMessage, res: ServerResponse, id: string, action: string, tail: number): Promise<void> {
    const container = containers.find((candidate) => candidate.id === id);
    if (!container) return json(res, 404, { message: `No such container: ${id}` });
    if (action === 'json') return json(res, 200, container.inspect ?? { State: { Status: container.state } });
    if (action === 'stats') return json(res, 200, STATS);
    if (action === 'logs') return void res.writeHead(200).end(logBody(container, tail));
    if (action !== 'exec') return json(res, 404, { message: 'page not found' });
    const body = await readJson(req);
    bodies.push(body);
    const argv = body.Cmd as string[];
    const execId = randomBytes(8).toString('hex');
    pending.set(execId, { container, argv, exitCode: null });
    execs.push(argv);
    json(res, 201, { Id: execId });
  }

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://docker');
    const path = url.pathname.replace(/^\/v[\d.]+/, '');
    requests.push(`${req.method} ${path}${url.search}`);
    const [, kind = '', id = '', action = ''] = path.split('/');

    if (path === '/info') return json(res, 200, ENGINE_INFO);
    if (path === '/containers/json') {
      const listed = containers.map((c) => ({ Id: c.id, Names: [`/${c.name}`], Image: c.image, State: c.state, Labels: c.labels }));
      return json(res, 200, listed);
    }
    if (kind === 'containers') return containerRoute(req, res, id, action, Number(url.searchParams.get('tail') ?? 100));
    if (kind === 'exec') return runExec(pending.get(id), action, res);
    json(res, 404, { message: 'page not found' });
  }

  const server = createServer((req, res) => {
    void route(req, res).catch((error: unknown) => json(res, 500, { message: String(error) }));
  });
  await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  return {
    socketPath,
    requests,
    execs,
    bodies,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
