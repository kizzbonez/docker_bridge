// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig, type BridgeConfig } from '../config.ts';
import { InvalidParams, ToolError } from '../errors.ts';
import { containerId, frame, startFakeEngine, type FakeContainer, type FakeEngine } from '../test-support/fake-engine.ts';
import { findContainer, listContainers } from './containers.ts';
import { callJson, createEngine } from './engine.ts';
import { healthOf, usageFrom } from './inspect.ts';
import { demux, toLines } from './stream.ts';

const LIMITS = { timeoutMs: 2_000, maxBytes: 1024 * 1024 };
const compose = (project: string, service: string, extra: Record<string, string> = {}) => ({
  'com.docker.compose.project': project,
  'com.docker.compose.service': service,
  ...extra,
});

const FLEET: FakeContainer[] = [
  { id: containerId('shop-web'), name: 'shop-web-1', image: 'nginx:1.30', state: 'running', labels: compose('shop', 'web', { 'com.docker.compose.depends_on': 'api:service_healthy:false' }) },
  { id: containerId('shop-api'), name: 'shop-api-1', image: 'shop/api:2', state: 'running', labels: compose('shop', 'api') },
  { id: containerId('blog-web'), name: 'blog-web-1', image: 'nginx:1.30', state: 'running', labels: compose('blog', 'web') },
  { id: containerId('loose'), name: 'scratchpad', image: 'alpine', state: 'exited', labels: {} },
];

let fake: FakeEngine;
afterEach(() => fake?.close());

async function access(config: Partial<BridgeConfig> = {}, fleet = FLEET) {
  fake = await startFakeEngine(fleet);
  return { engine: createEngine(fake.socketPath, LIMITS), config: { ...loadConfig({}), ...config } };
}

describe('config', () => {
  it('is read-only unless explicitly switched off', () => {
    for (const value of [undefined, '', 'true', 'yes', 'maybe']) expect(loadConfig({ READ_ONLY_MODE: value }).readOnly).toBe(true);
    for (const value of ['false', 'FALSE', '0', 'off', ' no ']) expect(loadConfig({ READ_ONLY_MODE: value }).readOnly).toBe(false);
  });

  it('finds the local engine socket and ignores remote engines', () => {
    expect(loadConfig({}, 'win32').socketPath).toBe('//./pipe/docker_engine');
    expect(loadConfig({}, 'linux').socketPath).toBe('/var/run/docker.sock');
    expect(loadConfig({ DOCKER_HOST: 'unix:///run/user/1000/docker.sock' }, 'linux').socketPath).toBe('/run/user/1000/docker.sock');
    expect(loadConfig({ DOCKER_HOST: 'npipe:////./pipe/dockerDesktopLinuxEngine' }, 'win32').socketPath).toBe('//./pipe/dockerDesktopLinuxEngine');
    expect(loadConfig({ DOCKER_HOST: 'tcp://10.0.0.9:2375' }, 'linux').socketPath).toBe('/var/run/docker.sock');
    expect(loadConfig({ DOCKER_SOCKET_PATH: '/custom.sock', DOCKER_HOST: 'unix:///other.sock' }).socketPath).toBe('/custom.sock');
    expect(loadConfig({ DOCKER_BRIDGE_PROJECTS: ' shop , blog,, ' }).projects).toEqual(['shop', 'blog']);
    expect(loadConfig({}).projects).toBeNull();
  });
});

describe('stream demux', () => {
  it('separates stdout from stderr and keeps their order', () => {
    const buffer = Buffer.concat([frame(1, 'one\n'), frame(2, 'oops\n'), frame(1, 'two\n')]);
    expect(demux(buffer)).toEqual({ stdout: 'one\ntwo\n', stderr: 'oops\n', combined: 'one\noops\ntwo\n' });
    expect(toLines('one\r\ntwo\n')).toEqual(['one', 'two']);
    expect(toLines('')).toEqual([]);
  });

  it('keeps what it can of a frame cut short', () => {
    const cut = frame(1, 'hello world').subarray(0, 8 + 5);
    expect(demux(cut).stdout).toBe('hello');
    expect(demux(Buffer.from([1, 0, 0])).combined).toBe('');
  });
});

describe('engine client', () => {
  it('talks to the engine over a socket or named pipe', async () => {
    const { engine } = await access();
    const listed = await callJson<Array<{ Id: string }>>(engine, 'GET', '/containers/json?all=true');
    expect(listed).toHaveLength(4);
    expect(fake.requests).toEqual(['GET /containers/json?all=true']);
  });

  it('turns engine errors and an unreachable engine into readable failures', async () => {
    const { engine } = await access();
    await expect(callJson(engine, 'GET', `/containers/${containerId('missing')}/json`)).rejects.toThrow(/No such container/);
    const nowhere = createEngine(`${fake.socketPath}-absent`, LIMITS);
    await expect(nowhere.send('GET', '/containers/json')).rejects.toThrow(ToolError);
    await expect(nowhere.send('GET', '/containers/json')).rejects.toThrow(/cannot reach the Docker Engine/);
  });

  it('stops reading at the size limit and gives up at the deadline', async () => {
    const big: FakeContainer = { ...FLEET[0]!, log: Array.from({ length: 500 }, (_, i) => `line ${i} ${'x'.repeat(100)}`), exec: () => ({ delayMs: 400 }) };
    const { engine } = await access({}, [big]);
    const capped = await engine.send('GET', `/containers/${big.id}/logs?tail=500`, { maxBytes: 1000 });
    expect(capped).toMatchObject({ truncated: true, timedOut: false });
    expect(capped.body.length).toBe(1000);

    const created = await callJson<{ Id: string }>(engine, 'POST', `/containers/${big.id}/exec`, { body: { Cmd: ['sleep', '9'] } });
    const slow = await engine.send('POST', `/exec/${created.Id}/start`, { body: {}, timeoutMs: 80 });
    expect(slow.timedOut).toBe(true);
  });
});

describe('containers', () => {
  it('lists everything, or only the allowed compose projects', async () => {
    expect((await listContainers(await access())).map((c) => c.name)).toEqual(['shop-web-1', 'shop-api-1', 'blog-web-1', 'scratchpad']);
    await fake.close();
    const limited = await listContainers(await access({ projects: ['shop'] }));
    expect(limited.map((c) => c.name)).toEqual(['shop-web-1', 'shop-api-1']);
    expect(limited[0]).toMatchObject({ service: 'web', project: 'shop', dependsOn: ['api'] });
  });

  it('drops entries whose id is not a plain container id', async () => {
    const odd = { ...FLEET[0]!, id: '../../secrets' };
    expect(await listContainers(await access({}, [odd, FLEET[1]!]))).toHaveLength(1);
  });

  it('resolves a container by service, name or id', async () => {
    const context = await access();
    expect((await findContainer(context, 'api')).name).toBe('shop-api-1');
    expect((await findContainer(context, 'blog-web-1')).project).toBe('blog');
    expect((await findContainer(context, containerId('shop-api').slice(0, 12))).name).toBe('shop-api-1');
    expect((await findContainer(context, 'web', 'blog')).name).toBe('blog-web-1');
  });

  it('refuses ambiguity, unknown names and names that are not names', async () => {
    const context = await access();
    await expect(findContainer(context, 'web')).rejects.toThrow(/matches 2 containers \(shop, blog\)/);
    await expect(findContainer(context, 'nope')).rejects.toThrow(/no container named "nope"\. Visible containers: shop-web-1/);
    for (const bad of ['../etc', 'a/b', 'web;rm', '', 'x'.repeat(200), '-rf']) {
      await expect(findContainer(context, bad), bad).rejects.toThrow(InvalidParams);
    }
    // Only the engine's own ids ever reach a request path.
    expect(fake.requests.every((request) => request === 'GET /containers/json?all=true')).toBe(true);
  });

  it('cannot see a container outside the allowed projects', async () => {
    const context = await access({ projects: ['shop'] });
    await expect(findContainer(context, 'blog-web-1')).rejects.toThrow(/no container named/);
  });
});

describe('health and usage', () => {
  it('summarises container state in one word', () => {
    expect(healthOf({ Status: 'running', Health: { Status: 'healthy' } })).toBe('healthy');
    expect(healthOf({ Status: 'running', Health: { Status: 'unhealthy' } })).toBe('unhealthy');
    expect(healthOf({ Status: 'running' })).toBe('running');
    expect(healthOf({ Status: 'restarting', Restarting: true, ExitCode: 137 })).toBe('restarting');
    expect(healthOf({ Status: 'exited', ExitCode: 0 })).toBe('completed');
    expect(healthOf({ Status: 'exited', ExitCode: 137, OOMKilled: true })).toBe('exited');
    expect(healthOf({ Status: 'paused' })).toBe('paused');
    expect(healthOf({})).toBe('unknown');
  });

  it('computes CPU and memory the way docker stats does', () => {
    const usage = usageFrom({
      cpu_stats: { cpu_usage: { total_usage: 400 }, system_cpu_usage: 2000, online_cpus: 2 },
      precpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 1000 },
      memory_stats: { usage: 220 * 1048576, stats: { inactive_file: 20 * 1048576 } },
    });
    expect(usage).toEqual({ cpuPercent: 40, memoryUsedMib: 200 });
    expect(usageFrom({})).toEqual({ cpuPercent: 0, memoryUsedMib: 0 });
  });
});
