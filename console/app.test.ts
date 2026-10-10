// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConsoleConfig } from './config.ts';
import { boot, json, later, tool } from './test-harness.ts';

describe('access', () => {
  it('answers nothing without a session, except its own health check', async () => {
    const app = await boot({}, false);
    expect((await app.call('GET', '/api/healthz')).status).toBe(200);
    for (const [method, path] of [['GET', '/api/engine'], ['GET', '/api/activity'], ['POST', '/api/tools/call']] as const) {
      const response = await app.call(method, path, method === 'POST' ? { name: 'docker_safe_exec', arguments: { container: 'web', command: 'ls' } } : undefined);
      expect(response.status, path).toBe(401);
    }
    expect(app.fake.requests).toEqual([]);
  });

  it('refuses a tool call that another site made the browser send', async () => {
    const app = await boot();
    const args = { container: 'web', command: 'ls' };
    expect((await tool(app, 'docker_safe_exec', args, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await tool(app, 'docker_safe_exec', args, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await tool(app, 'docker_safe_exec', args, { 'sec-fetch-site': 'same-origin' })).status).toBe(200);
    expect(app.fake.execs).toHaveLength(1);
  });

  it('accepts JSON only, of a sensible size, on routes that exist', async () => {
    const app = await boot();
    const form = await fetch(`${app.url}/api/tools/call`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
    expect(form.status).toBe(415);
    expect((await app.call('POST', '/api/tools/call', { name: 'x', arguments: { padding: 'p'.repeat(5000) } })).status).toBe(413);
    expect((await app.call('GET', '/api/tools/call')).status).toBe(404);
    expect((await app.call('DELETE', '/api/engine')).status).toBe(404);
    expect((await app.call('GET', '/api/../auth/account')).status).toBe(404);
  });
});

describe('GET /api/engine', () => {
  it('summarises the engine, the visible containers and the bridge', async () => {
    const body = await json(await (await boot()).call('GET', '/api/engine'));
    expect(body).toMatchObject({
      reachable: true,
      engine: { version: '29.8.0', os: 'Docker Desktop', cpus: 12, memoryMib: 16384 },
      containers: { total: 5, running: 4 },
      projects: [
        { name: 'docker-bridge', total: 2, running: 2 },
        { name: 'shop', total: 2, running: 1 },
      ],
      standalone: 1,
      bridge: { readOnly: true, scope: null, execEnabled: true, selfProject: 'docker-bridge' },
    });
  });

  it('counts only what a project scope lets the bridge see', async () => {
    const scope = loadConsoleConfig({ DOCKER_BRIDGE_PROJECTS: 'shop' }).bridge;
    const first = await boot({ selfId: null });
    const scoped = await boot({ bridge: { ...scope, socketPath: first.fake.socketPath }, selfId: null });
    const body = await json(await scoped.call('GET', '/api/engine'));
    expect(body).toMatchObject({ containers: { total: 2, running: 1 }, projects: [{ name: 'shop' }], standalone: 0, bridge: { scope: ['shop'], selfProject: null } });
  });

  it('says the engine is unreachable instead of failing', async () => {
    const { bridge } = loadConsoleConfig({ DOCKER_SOCKET_PATH: '//./pipe/dockerbridge-console-test-missing' });
    const response = await (await boot({ bridge })).call('GET', '/api/engine');
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ reachable: false, error: expect.stringContaining('cannot reach the Docker Engine'), bridge: { readOnly: true, selfProject: null } });
  });
});

describe('GET /api/activity', () => {
  it('merges what agents did with what the console ran, newest first, with totals', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dockerbridge-console-test-'));
    later(() => rm(dir, { recursive: true, force: true }));
    const agent = (at: string, outcome: string, tokens: object) => JSON.stringify({ at, client: 'cursor 1.9', tool: 'docker_tail_filtered_logs', target: 'shop/web', detail: 'error', outcome, ms: 31, tokens });
    await writeFile(join(dir, 'calls.jsonl'), [agent('2026-10-10T09:00:00Z', 'ok', { raw: 18400, returned: 320 }), 'not a record', agent('2026-10-10T13:00:00Z', 'error', { raw: null, returned: 12 })].join('\n'));

    const app = await boot({ activityDir: dir });
    await tool(app, 'docker_safe_exec', { container: 'web', command: 'rm -rf /' });
    const body = await json(await app.call('GET', '/api/activity'));

    expect(body.calls.map((call: { client: string; outcome: string }) => [call.client, call.outcome])).toEqual([
      ['cursor 1.9', 'error'],
      ['web console', 'refused'],
      ['cursor 1.9', 'ok'],
    ]);
    expect(body.totals).toMatchObject({ calls: 3, refused: 1, failed: 1, tokens: { raw: 18400, saved: 18080 }, clients: ['cursor 1.9', 'web console'] });
    expect(body.window).toBe(3);
  });

  it('writes an audit line for every call made from the browser, without the output', async () => {
    const app = await boot();
    await tool(app, 'docker_safe_exec', { container: 'web', command: 'ls /etc' });
    const [line] = app.audit;
    expect(JSON.parse(line ?? '{}')).toMatchObject({ level: 'audit', client: 'web console', tool: 'docker_safe_exec', target: 'web', detail: 'ls /etc', outcome: 'ok' });
    expect(line).not.toContain('ran ls');
  });

  it('works with no agent log mounted', async () => {
    const body = await json(await (await boot({ activityDir: null })).call('GET', '/api/activity'));
    expect(body).toMatchObject({ calls: [], window: 0, totals: { calls: 0 } });
  });
});
