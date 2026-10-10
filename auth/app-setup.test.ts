// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PASSWORD, SETUP_TOKEN, USERNAME, boot, cookieOf, onboard, type Harness } from './test-harness.ts';

let app: Harness;
afterEach(() => app.close());

const setup = (path: string, body: Record<string, unknown>, headers?: Record<string, string>) =>
  app.call('POST', `/auth/setup/${path}`, { token: SETUP_TOKEN, ...body }, headers);

describe('a fresh install', () => {
  it('reports that setup is required and refuses sign-in', async () => {
    app = await boot();
    expect(await (await app.call('GET', '/auth/status')).json()).toEqual({ setupRequired: true, authenticated: false, user: null });
    expect((await app.call('POST', '/auth/login', { username: USERNAME, password: PASSWORD })).status).toBe(409);
    expect((await app.call('GET', '/auth/verify')).status).toBe(401);
    expect((await app.call('GET', '/auth/account')).status).toBe(401);
  });

  it('generates a setup token when none is configured', async () => {
    app = await boot({ setupToken: null });
    expect(app.ctx.setup.token).toMatch(/^([A-Z2-9]{5}-){3}[A-Z2-9]{5}$/);
    expect((await app.call('POST', '/auth/setup/token', { token: app.ctx.setup.token })).status).toBe(204);
  });
});

describe('the setup token', () => {
  it('is required by every onboarding step', async () => {
    app = await boot();
    for (const path of ['token', 'totp', 'complete']) {
      const response = await app.call('POST', `/auth/setup/${path}`, { token: 'WRONG-WRONG-WRONG-WRONG', username: USERNAME });
      expect(response.status, path).toBe(403);
      expect(await response.json()).toEqual({ error: 'invalid_token' });
    }
  });

  it('is accepted regardless of case, spaces or dashes', async () => {
    app = await boot();
    expect((await app.call('POST', '/auth/setup/token', { token: SETUP_TOKEN.toLowerCase().replaceAll('-', ' ') })).status).toBe(204);
  });

  it('locks the client out after repeated wrong guesses', async () => {
    app = await boot();
    for (let i = 0; i < 5; i += 1) await app.call('POST', '/auth/setup/token', { token: 'nope' });
    const locked = await setup('token', {});
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get('retry-after'))).toBeGreaterThan(0);
    // Another client is unaffected, and the lock lifts with time.
    expect((await setup('token', {}, { 'x-real-ip': '10.9.9.9' })).status).toBe(204);
    app.advance(15 * 60_000 + 1);
    expect((await setup('token', {})).status).toBe(204);
  });
});

describe('onboarding', () => {
  it('rejects bad usernames, weak passwords and wrong authenticator codes', async () => {
    app = await boot();
    expect((await setup('totp', { username: 'a b' })).status).toBe(400);
    const { secret } = (await (await setup('totp', { username: USERNAME })).json()) as { secret: string };

    const weak = await setup('complete', { username: USERNAME, password: 'short', code: app.code(secret) });
    expect(weak.status).toBe(400);
    expect(await weak.json()).toMatchObject({ error: 'weak_password', issues: expect.arrayContaining(['too_short']) });

    const wrongCode = await setup('complete', { username: USERNAME, password: PASSWORD, code: '000000' });
    expect(wrongCode.status).toBe(401);
    const mismatch = await setup('complete', { username: 'someone-else', password: PASSWORD, code: app.code(secret) });
    expect(mismatch.status).toBe(409);
    expect(app.ctx.state.account()).toBeNull();
  });

  it('refuses to finish before an authenticator has been enrolled', async () => {
    app = await boot();
    const response = await setup('complete', { username: USERNAME, password: PASSWORD, code: '123456' });
    expect(await response.json()).toEqual({ error: 'enrollment_not_started' });
  });

  it('creates the account, returns recovery codes once, and signs the administrator in', async () => {
    app = await boot();
    const enroll = await setup('totp', { username: USERNAME });
    const { secret, uri } = (await enroll.json()) as { secret: string; uri: string };
    expect(uri).toContain(`otpauth://totp/DockerBridge:${USERNAME}?secret=${secret}`);

    const done = await setup('complete', { username: USERNAME, password: PASSWORD, code: app.code(secret) });
    expect(done.status).toBe(200);
    const body = (await done.json()) as { user: string; recoveryCodes: string[] };
    expect(body.user).toBe(USERNAME);
    expect(body.recoveryCodes).toHaveLength(10);

    const status = await app.call('GET', '/auth/status', undefined, { cookie: cookieOf(done) });
    expect(await status.json()).toEqual({ setupRequired: false, authenticated: true, user: USERNAME });
    expect(app.ctx.audit.recent()[0]).toMatchObject({ type: 'setup_completed', detail: USERNAME });
  });

  it('stores hashes only, never the password or the recovery codes', async () => {
    app = await boot();
    const { recoveryCodes } = await onboard(app);
    const stored = await readFile(join(app.dataDir, 'account.json'), 'utf8');
    expect(stored).not.toContain(PASSWORD);
    for (const code of recoveryCodes) expect(stored).not.toContain(code);
    expect(JSON.parse(stored).passwordHash).toMatch(/^scrypt\$/);
  });

  it('closes for good once an account exists', async () => {
    app = await boot();
    await onboard(app);
    for (const path of ['token', 'totp', 'complete']) {
      const response = await setup(path, { username: 'intruder', password: PASSWORD, code: '123456' });
      expect(response.status, path).toBe(409);
      expect(await response.json()).toEqual({ error: 'already_configured' });
    }
  });

  it('survives a restart: the account persists, sessions do not', async () => {
    app = await boot();
    const { cookie } = await onboard(app);
    const dataDir = app.dataDir;
    const restarted = await boot({}, dataDir);
    try {
      expect(await (await restarted.call('GET', '/auth/status', undefined, { cookie })).json()).toEqual({
        setupRequired: false,
        authenticated: false,
        user: null,
      });
      await restarted.ctx.state.clear();
      expect(restarted.ctx.state.account()).toBeNull();
    } finally {
      await restarted.close();
    }
  });
});
