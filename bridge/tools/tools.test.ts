// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, type BridgeConfig } from '../config.ts';
import { REDACTED } from '../core/redact.ts';
import { createEngine } from '../docker/engine.ts';
import { InvalidParams, ToolError } from '../errors.ts';
import { containerId, startFakeEngine, type FakeContainer, type FakeEngine } from '../test-support/fake-engine.ts';
import { safeExec } from './exec.ts';
import { tailLogs } from './logs.ts';
import { stackTopology } from './topology.ts';

const labels = (service: string, dependsOn = '') => ({
  'com.docker.compose.project': 'shop',
  'com.docker.compose.service': service,
  'com.docker.compose.depends_on': dependsOn,
});
const esc = String.fromCharCode(27);

const web: FakeContainer = {
  id: containerId('web'),
  name: 'shop-web-1',
  image: 'nginx:1.30',
  state: 'running',
  labels: labels('web', 'api:service_healthy:false'),
  inspect: { RestartCount: 0, HostConfig: { Memory: 128 * 1048576 }, State: { Status: 'running', Health: { Status: 'healthy' } } },
  log: [
    `${esc}[32m[info]${esc}[0m GET /healthz 200`,
    'ERR:[error] *41 connect() failed (111: Connection refused) upstream: http://api:8080',
    `${esc}[32m[info]${esc}[0m GET /healthz 200`,
    'ERR:[error] *42 connect() failed (111: Connection refused) upstream: http://api:8080',
    '[error] auth failed for postgres://app:hunter2@db:5432/shop',
  ],
};
const api: FakeContainer = {
  id: containerId('api'),
  name: 'shop-api-1',
  image: 'shop/api:2',
  state: 'running',
  labels: labels('api', 'db:service_started:false,cache:service_started:false'),
  inspect: { RestartCount: 3, State: { Status: 'running', Health: { Status: 'unhealthy' } } },
  exec: (argv) => {
    const command = argv.join(' ');
    if (command === 'env') return { stdout: 'PORT=8081\nAUTH_MAX_FAILURES=5\nJWT_SECRET=abc123\nDATABASE_URL=postgres://u:p@db/x\n' };
    if (command === 'printenv JWT_SECRET') return { stdout: 'abc123\n' };
    if (command === 'sleep 30') return { delayMs: 5000 };
    return { stdout: `ran: ${command}\n`, stderr: 'warn: slow\n', exitCode: 0 };
  },
};
const cache: FakeContainer = {
  id: containerId('cache'),
  name: 'shop-cache-1',
  image: 'redis:7.4',
  state: 'exited',
  labels: labels('cache'),
  inspect: { RestartCount: 4, State: { Status: 'exited', ExitCode: 137, OOMKilled: true } },
};
const migrate: FakeContainer = { id: containerId('migrate'), name: 'shop-migrate-1', image: 'shop/api:2', state: 'exited', labels: labels('migrate'), inspect: { State: { Status: 'exited', ExitCode: 0 } } };

let fake: FakeEngine;
afterEach(() => fake?.close());

async function access(config: Partial<BridgeConfig> = {}, fleet = [web, api, cache, migrate]) {
  fake = await startFakeEngine(fleet);
  return { engine: createEngine(fake.socketPath, { timeoutMs: 3_000, maxBytes: 1024 * 1024 }), config: { ...loadConfig({}), ...config } };
}

describe('docker_get_stack_topology', () => {
  it('reports health, exits, metrics and dependency edges for one compose project', async () => {
    const topology = await stackTopology(await access(), { project: 'shop', include_metrics: true, include_stopped: true });
    expect(topology.unhealthy).toEqual(['api', 'cache']);
    expect(topology.edges).toEqual([{ from: 'web', to: 'api' }, { from: 'api', to: 'cache' }]);
    expect(topology.services).toEqual([
      { name: 'web', image: 'nginx:1.30', health: 'healthy', restarts: 0, cpu_percent: 40, memory_mib: { used: 200, limit: 128 } },
      { name: 'api', image: 'shop/api:2', health: 'unhealthy', restarts: 3, cpu_percent: 40, memory_mib: { used: 200, limit: null } },
      { name: 'cache', image: 'redis:7.4', health: 'exited', restarts: 4, last_exit: { code: 137, reason: 'OOMKilled' } },
      { name: 'migrate', image: 'shop/api:2', health: 'completed', restarts: 0 },
    ]);
  });

  it('can leave out metrics and stopped containers', async () => {
    const topology = await stackTopology(await access(), { project: 'shop', include_metrics: false, include_stopped: false });
    expect((topology.services as Array<{ name: string }>).map((service) => service.name)).toEqual(['web', 'api']);
    expect(JSON.stringify(topology)).not.toContain('cpu_percent');
    expect(fake.requests.some((request) => request.includes('/stats'))).toBe(false);
  });

  it('names the projects it can see when asked for one it cannot', async () => {
    await expect(stackTopology(await access(), { project: 'nope', include_metrics: false, include_stopped: true })).rejects.toThrow(
      'no containers found for compose project "nope". Known projects: shop',
    );
  });
});

describe('docker_tail_filtered_logs', () => {
  const args = { container: 'web', filter_pattern: 'error', tail_lines: 100, strip_ansi: true, token_budget: 320 };

  it('merges stdout and stderr, filters, collapses repeats and redacts', async () => {
    const result = await tailLogs(await access(), args);
    expect(result).toMatchObject({ container: 'shop-web-1', scanned_lines: 5, matched_lines: 3, returned_lines: 2, truncated: false });
    expect(result.lines).toEqual([
      { line: 2, repeats: 2, text: '[error] *41 connect() failed (111: Connection refused) upstream: http://api:8080' },
      { line: 5, repeats: 1, text: `[error] auth failed for postgres://app:${REDACTED}@db:5432/shop` },
    ]);
  });

  it('asks the engine for the tail only', async () => {
    await tailLogs(await access(), { ...args, tail_lines: 250 });
    expect(fake.requests.at(-1)).toBe(`GET /containers/${web.id}/logs?stdout=1&stderr=1&tail=250`);
  });

  it('reads a TTY container\'s log as plain text', async () => {
    const tty = { ...web, inspect: { Config: { Tty: true }, State: { Status: 'running' } }, log: ['plain error line'] };
    // The fake always frames its output; with Tty the client must not demux it.
    const result = await tailLogs(await access({}, [tty]), { ...args, filter_pattern: 'plain' });
    expect(JSON.stringify(result.lines)).toContain('plain error line');
  });

  it('rejects a dangerous pattern before contacting the engine', async () => {
    const context = await access();
    await expect(tailLogs(context, { ...args, filter_pattern: '(a+)+$' })).rejects.toThrow(InvalidParams);
    expect(fake.requests).toEqual([]);
  });
});

describe('docker_safe_exec', () => {
  const run = (context: Awaited<ReturnType<typeof access>>, command: string, timeout_ms = 2000) => safeExec(context, { container: 'api', command, timeout_ms });

  it('runs an allowlisted command as plain argv, with nothing wrapped around it', async () => {
    const result = await run(await access(), 'cat "/app/my file.txt"');
    expect(fake.execs).toEqual([['cat', '/app/my file.txt']]);
    expect(result).toMatchObject({ container: 'shop-api-1', allowed: true, exit_code: 0, timed_out: false, stdout: 'ran: cat /app/my file.txt', stderr: 'warn: slow' });
  });

  it('never contacts the engine for a refused command', async () => {
    const context = await access();
    for (const command of ['rm -rf /', 'env sh -c id', 'cat /run/secrets/key', 'ls; id', 'redis-cli set k v', 'sleep 3600', 'cat "unterminated']) {
      const result = await run(context, command);
      expect(result, command).toMatchObject({ allowed: false, exit_code: null, stdout: '' });
      expect(String(result.stderr), command).toMatch(/^blocked: /);
    }
    expect(fake.requests).toEqual([]);
  });

  it('allows a state-changing command only when READ_ONLY_MODE is off', async () => {
    const context = await access({ readOnly: false });
    expect(await run(context, 'redis-cli config set maxmemory 384mb')).toMatchObject({ allowed: true, guardrail: expect.stringContaining('READ_ONLY_MODE=false') });
    expect(await run(context, 'redis-cli flushall')).toMatchObject({ allowed: false });
  });

  it('redacts secrets from env output and leaves ordinary settings readable', async () => {
    const context = await access();
    expect((await run(context, 'env')).stdout).toBe(`PORT=8081\nAUTH_MAX_FAILURES=5\nJWT_SECRET=${REDACTED}\nDATABASE_URL=${REDACTED}`);
    expect((await run(context, 'printenv JWT_SECRET')).stdout).toBe(REDACTED);
  });

  it('stops waiting at the deadline and says so, keeping any output so far', async () => {
    const result = await run(await access(), 'sleep 30', 300);
    expect(result).toMatchObject({ allowed: true, timed_out: true, exit_code: null, stderr: 'stopped waiting after 300 ms (timeout_ms)' });
    expect(Number(result.duration_ms)).toBeLessThan(1500);
  });

  it('asks the database to cancel a query that outlives the deadline', async () => {
    const context = await access();
    await run(context, 'psql -c "select 1"', 4000);
    const created = fake.bodies.find((body) => Array.isArray(body.Cmd) && body.Cmd[0] === 'psql');
    expect(created?.Env).toEqual(['PGOPTIONS=-c statement_timeout=4000']);
    await run(context, 'ps');
    expect(fake.bodies.at(-1)?.Env).toEqual([]);
  });

  it('reports a binary the image does not have', async () => {
    const bare: FakeContainer = { ...api, exec: () => ({ startError: 'OCI runtime exec failed: exec: "psql": executable file not found in $PATH' }) };
    const result = await run(await access({}, [bare]), 'psql -c "select 1"');
    expect(result).toMatchObject({ allowed: true, exit_code: 127, timed_out: false });
    expect(String(result.stderr)).toContain('executable file not found');
  });

  it('refuses a container that is not running', async () => {
    await expect(safeExec(await access(), { container: 'cache', command: 'redis-cli ping', timeout_ms: 2000 })).rejects.toThrow(ToolError);
  });
});
