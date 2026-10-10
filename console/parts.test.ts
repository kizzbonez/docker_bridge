// @vitest-environment node
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../bridge/docker/engine.ts';
import { containerId } from '../bridge/test-support/fake-engine.ts';
import { loadConsoleConfig } from './config.ts';
import { createSelfLookup } from './self.ts';
import { createSessionCheck } from './session.ts';
import { createSharedReadings } from './shared-readings.ts';
import { SELF, fakeEngine, listen } from './test-harness.ts';

describe('the session check', () => {
  /** A stand-in for the auth service that knows one cookie. */
  async function authStub(): Promise<{ url: string; seen: Array<Record<string, unknown>> }> {
    const seen: Array<Record<string, unknown>> = [];
    const server = createServer((req, res) => {
      seen.push({ url: req.url, cookie: req.headers.cookie, ip: req.headers['x-real-ip'] });
      const ok = req.headers.cookie === 'db_session=good';
      res.writeHead(ok ? 200 : 401, ok ? { 'X-Auth-User': 'operator' } : {}).end('{}');
    });
    return { url: await listen(server), seen };
  }

  const request = (headers: Record<string, string>) => ({ headers }) as never;

  it('asks the auth service, forwarding the cookie and the visitor address', async () => {
    const auth = await authStub();
    const check = createSessionCheck(auth.url);
    expect(await check(request({ cookie: 'db_session=good', 'x-real-ip': '203.0.113.9', authorization: 'never forwarded' }))).toBe('operator');
    expect(await check(request({ cookie: 'db_session=stolen-or-expired' }))).toBeNull();
    expect(auth.seen[0]).toEqual({ url: '/auth/verify', cookie: 'db_session=good', ip: '203.0.113.9' });
  });

  it('treats no cookie, and an auth service that does not answer, as signed out', async () => {
    const auth = await authStub();
    expect(await createSessionCheck(auth.url)(request({}))).toBeNull();
    expect(auth.seen).toEqual([]);
    expect(await createSessionCheck('http://127.0.0.1:1')(request({ cookie: 'db_session=good' }))).toBeNull();
  });

  it('is skipped only when no auth service is configured', async () => {
    expect(await createSessionCheck(null)(request({}))).toBe('development');
  });
});

describe('finding its own stack', () => {
  const engineFor = async () => {
    const fake = await fakeEngine();
    return { fake, engine: createEngine(fake.socketPath, { timeoutMs: 2000, maxBytes: 1_000_000 }) };
  };

  it('remembers a successful lookup and retries a failed one', async () => {
    const { fake, engine } = await engineFor();
    const lookup = createSelfLookup(engine, SELF);
    expect(await lookup()).toEqual({ status: 'known', project: 'docker-bridge' });
    await lookup();
    expect(fake.requests.filter((line) => line.includes(SELF))).toHaveLength(1);

    const gone = containerId('gone');
    const lost = createSelfLookup(engine, gone);
    expect(await lost()).toEqual({ status: 'unknown' });
    expect(await lost()).toEqual({ status: 'unknown' });
    expect(fake.requests.filter((line) => line.includes(gone))).toHaveLength(2);
  });

  it('has nothing to protect outside a container or outside compose', async () => {
    const { engine } = await engineFor();
    expect(await createSelfLookup(engine, null)()).toEqual({ status: 'none' });
    expect(await createSelfLookup(engine, containerId('lonely'))()).toEqual({ status: 'none' });
  });
});

describe('configuration', () => {
  it('is read-only with exec on, and knows a container id when it sees one', () => {
    const config = loadConsoleConfig({ HOSTNAME: 'a1b2c3d4e5f6', AUTH_URL: 'http://auth:8081/', DOCKER_BRIDGE_ACTIVITY_DIR: '/activity' }, 'linux');
    expect(config).toMatchObject({ port: 8082, authUrl: 'http://auth:8081', activityDir: '/activity', execEnabled: true, selfId: 'a1b2c3d4e5f6' });
    expect(config.bridge).toMatchObject({ readOnly: true, socketPath: '/var/run/docker.sock', projects: null });
  });

  it('treats a machine name as "not in a container", and honours the switches', () => {
    const config = loadConsoleConfig({ HOSTNAME: 'mini-server', CONSOLE_EXEC: 'false', CONSOLE_PORT: '9000', READ_ONLY_MODE: 'false', AUTH_URL: '  ' }, 'linux');
    expect(config).toMatchObject({ selfId: null, execEnabled: false, port: 9000, authUrl: null, activityDir: null });
    expect(config.bridge.readOnly).toBe(false);
    expect(loadConsoleConfig({ CONSOLE_PORT: '99999' }).port).toBe(8082);
  });
});

describe('shared readings', () => {
  const deferred = () => {
    let resolve: (value: string) => void = () => undefined;
    const promise = new Promise<string>((done) => (resolve = done));
    return { promise, resolve };
  };

  it('answers everyone asking the same thing with one reading', async () => {
    let clock = 0;
    const share = createSharedReadings<string>(4000, () => true, () => clock);
    const first = deferred();
    let loads = 0;
    const load = () => {
      loads += 1;
      return first.promise;
    };
    const waiting = [share('shop', load), share('shop', load), share('shop', load)];
    first.resolve('reading 1');
    expect(await Promise.all(waiting)).toEqual(['reading 1', 'reading 1', 'reading 1']);
    expect(loads).toBe(1);

    clock = 3999;
    expect(await share('shop', async () => 'never asked')).toBe('reading 1');
    clock = 4000;
    expect(await share('shop', async () => 'reading 2')).toBe('reading 2');
    expect(await share('blog', async () => 'another project')).toBe('another project');
  });

  it('never serves a failure to the next caller', async () => {
    const share = createSharedReadings<string>(4000, (value) => value !== 'engine timed out', () => 0);
    expect(await share('shop', async () => 'engine timed out')).toBe('engine timed out');
    expect(await share('shop', async () => 'recovered')).toBe('recovered');

    await expect(share('blog', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(await share('blog', async () => 'fine now')).toBe('fine now');
  });

  it('does not grow without bound', async () => {
    const share = createSharedReadings<string>(4000, () => true, () => 0);
    for (let index = 0; index < 100; index += 1) await share(`project-${index}`, async () => 'x');
    // The oldest question was dropped to make room, so it is asked again.
    expect(await share('project-0', async () => 'asked again')).toBe('asked again');
    expect(await share('project-99', async () => 'never asked')).toBe('x');
  });
});
