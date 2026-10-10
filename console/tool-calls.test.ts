// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { containerId } from '../bridge/test-support/fake-engine.ts';
import { boot, json, tool } from './test-harness.ts';

describe('POST /api/tools/call', () => {
  it('returns a real topology', async () => {
    const body = await json(await tool(await boot(), 'docker_get_stack_topology', { project: 'shop' }));
    expect(body.isError).toBe(false);
    expect(body.structured.services.map((service: { name: string; health: string }) => [service.name, service.health])).toEqual([
      ['web', 'running'],
      ['db', 'exited'],
    ]);
  });

  it('filters a real log, and reports what the raw tail would have cost', async () => {
    const body = await json(await tool(await boot(), 'docker_tail_filtered_logs', { container: 'web', project: 'shop', filter_pattern: 'error' }));
    expect(body.structured).toMatchObject({ container: 'shop-web-1', scanned_lines: 3, matched_lines: 1, lines: [{ text: '[error] upstream refused' }] });
    expect(body.structured.tokens.raw_tail).toBeGreaterThan(body.structured.tokens.returned);
  });

  it('runs an allowlisted command in another stack', async () => {
    const app = await boot();
    const body = await json(await tool(app, 'docker_safe_exec', { container: 'web', command: 'ls -la /etc/nginx' }));
    expect(body).toMatchObject({ isError: false, structured: { allowed: true, exit_code: 0, stdout: 'ran ls -la /etc/nginx' } });
    expect(app.fake.execs).toEqual([['ls', '-la', '/etc/nginx']]);
  });

  it('applies the bridge policy: a destructive command never reaches the engine', async () => {
    const app = await boot();
    const body = await json(await tool(app, 'docker_safe_exec', { container: 'web', command: 'rm -rf /usr/share/nginx' }));
    expect(body).toMatchObject({ isError: true, structured: { allowed: false } });
    expect(app.fake.execs).toEqual([]);
  });

  it('never runs a command in its own stack, where the sign-in secrets live', async () => {
    const app = await boot();
    const targets = [{ container: 'auth' }, { container: 'docker-bridge-auth-1' }, { container: 'console', project: 'docker-bridge' }, { container: containerId('auth').slice(0, 12) }];
    for (const target of targets) {
      const body = await json(await tool(app, 'docker_safe_exec', { ...target, command: 'cat /data/account.json' }));
      expect(body, JSON.stringify(target)).toMatchObject({ isError: true, structured: { allowed: false, guardrail: expect.stringContaining('its own stack') } });
    }
    expect(app.fake.execs).toEqual([]);
    // Reading its own stack is fine: topology and logs are not refused.
    expect((await json(await tool(app, 'docker_get_stack_topology', { project: 'docker-bridge' }))).isError).toBe(false);
  });

  it('runs no command at all when it cannot tell which stack is its own', async () => {
    const app = await boot({ selfId: containerId('not-a-container-the-engine-knows') });
    const body = await json(await tool(app, 'docker_safe_exec', { container: 'web', command: 'ls' }));
    expect(body.structured).toMatchObject({ allowed: false, guardrail: expect.stringContaining('could not establish') });
    expect(app.fake.execs).toEqual([]);
  });

  it('can be switched off for the browser entirely', async () => {
    const app = await boot({ execEnabled: false });
    const body = await json(await tool(app, 'docker_safe_exec', { container: 'web', command: 'ls' }));
    expect(body.structured).toMatchObject({ allowed: false, guardrail: expect.stringContaining('CONSOLE_EXEC') });
    expect((await json(await tool(app, 'docker_tail_filtered_logs', { container: 'web' }))).isError).toBe(false);
    expect(app.fake.execs).toEqual([]);
  });

  it('answers a bad request with 400 and the reason', async () => {
    const app = await boot();
    const cases: Array<[unknown, string]> = [
      [{ name: 'docker_rm_everything', arguments: {} }, 'invalid_params'],
      [{ name: 'docker_safe_exec', arguments: { container: 'web' } }, 'invalid_params'],
      [{ name: 'docker_tail_filtered_logs', arguments: { container: 'web', filter_pattern: '(a+)+$' } }, 'invalid_params'],
      [{ arguments: {} }, 'invalid_request'],
      [{ name: 'n'.repeat(200) }, 'invalid_request'],
    ];
    for (const [body, code] of cases) {
      const response = await app.call('POST', '/api/tools/call', body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((await json(response)).error).toBe(code);
    }
  });

  it('reports a missing container as a result the page can show', async () => {
    const response = await tool(await boot(), 'docker_tail_filtered_logs', { container: 'nope' });
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ isError: true, structured: { error: expect.stringContaining('no container named "nope"') } });
  });
});
