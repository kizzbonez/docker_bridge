import { mockFetch, type Call } from '@/test/mock-fetch';
import type { ActivityView, EngineSummary, EngineUp, ExecResult, TailResult, Topology } from './model/console-api';

export const BRIDGE = { version: '0.3.0', readOnly: true, scope: null, execEnabled: true, selfProject: 'docker-bridge' };

export const ENGINE: EngineUp = {
  reachable: true,
  engine: { version: '29.8.0', os: 'Docker Desktop', cpus: 12, memoryMib: 16384 },
  containers: { total: 7, running: 6 },
  projects: [
    { name: 'docker-bridge', total: 3, running: 3 },
    { name: 'shop', total: 3, running: 2 },
  ],
  standalone: 1,
  bridge: BRIDGE,
};

export const SHOP: Topology = {
  project: 'shop',
  services: [
    { name: 'web', image: 'docker.io/library/nginx:1.30', health: 'healthy', restarts: 0, cpu_percent: 1.5, memory_mib: { used: 48, limit: 128 } },
    { name: 'api', image: 'sha256:0123456789abcdef0123456789abcdef', health: 'unhealthy', restarts: 4, cpu_percent: 91.2, memory_mib: { used: 300, limit: null } },
    { name: 'cache', image: 'redis:8', health: 'exited', restarts: 2, last_exit: { code: 137, reason: 'OOMKilled' } },
  ],
  edges: [
    { from: 'web', to: 'api' },
    { from: 'api', to: 'cache' },
  ],
  unhealthy: ['api', 'cache'],
};

export const OWN: Topology = {
  project: 'docker-bridge',
  services: [{ name: 'auth', image: 'dockerbridge-auth:local', health: 'healthy', restarts: 0 }],
  edges: [],
  unhealthy: [],
};

export const TAIL: TailResult = {
  container: 'shop-web-1',
  scanned_lines: 200,
  matched_lines: 41,
  returned_lines: 2,
  truncated: true,
  tokens: { raw_tail: 18400, returned: 320 },
  lines: [
    { line: 12, repeats: 38, text: '[error] connect() failed (111: Connection refused) while connecting to upstream' },
    { line: 190, repeats: 1, text: 'GET /orders 502' },
  ],
};

export const REFUSED: ExecResult = {
  container: 'web',
  allowed: false,
  guardrail: 'rm is not on the allowlist of diagnostic binaries',
  exit_code: null,
  timed_out: false,
  duration_ms: 0,
  stdout: '',
  stderr: 'blocked: rm is not on the allowlist of diagnostic binaries',
};

export const RAN: ExecResult = { container: 'shop-web-1', allowed: true, guardrail: 'read-only diagnostic', exit_code: 0, timed_out: false, duration_ms: 132, stdout: 'PID   USER\n1     nginx', stderr: '' };

export const ACTIVITY: ActivityView = {
  window: 2,
  totals: { calls: 2, refused: 1, failed: 0, tokens: { raw: 18400, returned: 320, saved: 18080 }, clients: ['cursor 1.9.2', 'web console'] },
  calls: [
    { at: '2026-10-10T11:59:30.000Z', client: 'cursor 1.9.2', tool: 'docker_tail_filtered_logs', target: 'shop/web', detail: 'error|502', outcome: 'ok', ms: 113, tokens: { raw: 18400, returned: 320 } },
    { at: '2026-10-10T11:00:00.000Z', client: 'web console', tool: 'docker_safe_exec', target: 'shop/web', detail: 'rm -rf /tmp', outcome: 'refused', ms: 2, tokens: { raw: null, returned: 77 } },
  ],
};

export const NO_ACTIVITY: ActivityView = { window: 0, calls: [], totals: { calls: 0, refused: 0, failed: 0, tokens: { raw: 0, returned: 0, saved: 0 }, clients: [] } };

type Reply = { status?: number; body?: unknown };

export interface Backend {
  engine?: EngineSummary | Reply;
  activity?: ActivityView;
  /** Answers one tool call; defaults cover topology for both projects. */
  tool?: (name: string, args: Record<string, unknown>) => Reply | undefined;
}

const isReply = (value: object): value is Reply => 'status' in value;
const ok = (structured: unknown, isError = false): Reply => ({ body: { structured, isError, ms: 12 } });

function defaultTool(name: string, args: Record<string, unknown>): Reply {
  if (name === 'docker_get_stack_topology') return ok(args.project === 'shop' ? SHOP : OWN);
  if (name === 'docker_tail_filtered_logs') return ok(TAIL);
  return ok(RAN);
}

/** A canned console service and auth service behind `fetch`. */
export function mockBackend({ engine = ENGINE, activity = ACTIVITY, tool }: Backend = {}): Call[] {
  return mockFetch({
    'GET /auth/status': { body: { setupRequired: false, authenticated: true, user: 'operator' } },
    'GET /api/engine': isReply(engine) ? engine : { body: engine },
    'GET /api/activity': { body: activity },
    'POST /api/tools/call': (body) => {
      const args = (body.arguments ?? {}) as Record<string, unknown>;
      return tool?.(String(body.name), args) ?? defaultTool(String(body.name), args);
    },
  });
}

export { ok as toolReply };
