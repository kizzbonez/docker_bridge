// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PASSWORD, USERNAME, boot, cookieOf, onboard, signIn, type Harness, type Onboarded } from './test-harness.ts';

let app: Harness;
let admin: Onboarded;

beforeEach(async () => {
  app = await boot();
  admin = await onboard(app);
});
afterEach(() => app.close());

const NEW_PASSWORD = 'saffron-meadow-compass-77';
const as = (cookie: string) => ({ cookie });
const fresh = (): string => {
  app.advance(30_000);
  return app.code(admin.secret);
};

interface Overview {
  user: string;
  recoveryCodesLeft: number;
  sessions: Array<{ id: string; current: boolean; ip: string }>;
  events: Array<{ type: string }>;
}
const overview = async (cookie: string): Promise<Overview> => (await app.call('GET', '/auth/account', undefined, as(cookie))).json() as Promise<Overview>;

describe('account overview', () => {
  it('requires a session for every account route', async () => {
    expect((await app.call('GET', '/auth/account')).status).toBe(401);
    for (const path of ['sessions/revoke', 'sessions/revoke-others', 'password', 'recovery-codes']) {
      expect((await app.call('POST', `/auth/account/${path}`, { id: 'x', code: '123456' })).status, path).toBe(401);
    }
  });

  it('lists sessions, flags the current one, and shows recent activity', async () => {
    const second = cookieOf(await signIn(app, admin.secret, { 'x-real-ip': '10.2.2.2', 'user-agent': 'Laptop' }));
    const body = await overview(second);
    expect(body).toMatchObject({ user: USERNAME, recoveryCodesLeft: 10 });
    expect(body.sessions).toHaveLength(2);
    expect(body.sessions.filter((session) => session.current)).toEqual([expect.objectContaining({ ip: '10.2.2.2' })]);
    expect(body.events.map((event) => event.type)).toEqual(expect.arrayContaining(['setup_completed', 'login_success']));
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|totpSecret|recoveryHashes/);
  });
});

describe('session management', () => {
  it('revokes one session by id', async () => {
    const other = cookieOf(await signIn(app, admin.secret));
    const target = (await overview(admin.cookie)).sessions.find((session) => !session.current);
    const revoked = await app.call('POST', '/auth/account/sessions/revoke', { id: target?.id }, as(admin.cookie));
    expect(revoked.status).toBe(204);
    expect((await app.call('GET', '/auth/verify', undefined, as(other))).status).toBe(401);
    expect((await app.call('GET', '/auth/verify', undefined, as(admin.cookie))).status).toBe(200);
    expect((await app.call('POST', '/auth/account/sessions/revoke', { id: 'ffffffffffff' }, as(admin.cookie))).status).toBe(404);
  });

  it('signs out everywhere else, keeping the current session', async () => {
    const others = [cookieOf(await signIn(app, admin.secret)), cookieOf(await signIn(app, admin.secret))];
    const response = await app.call('POST', '/auth/account/sessions/revoke-others', {}, as(admin.cookie));
    expect(await response.json()).toEqual({ revoked: 2 });
    for (const cookie of others) expect((await app.call('GET', '/auth/verify', undefined, as(cookie))).status).toBe(401);
    expect((await overview(admin.cookie)).sessions).toHaveLength(1);
  });
});

describe('changing the password', () => {
  const change = (body: Record<string, unknown>, cookie = admin.cookie) => app.call('POST', '/auth/account/password', body, as(cookie));

  it('needs the current password, a strong new one, and a fresh second factor', async () => {
    const weak = await change({ currentPassword: PASSWORD, newPassword: 'tiny', code: fresh() });
    expect(await weak.json()).toMatchObject({ error: 'weak_password' });
    const wrongCurrent = await change({ currentPassword: 'not-my-password-00', newPassword: NEW_PASSWORD, code: fresh() });
    expect(wrongCurrent.status).toBe(401);
    const wrongCode = await change({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD, code: '000000' });
    expect(await wrongCode.json()).toEqual({ error: 'invalid_code' });
    // Nothing changed: the old password still opens a challenge.
    expect((await app.call('POST', '/auth/login', { username: USERNAME, password: PASSWORD })).status).toBe(200);
  });

  it('replaces the password and signs out every other session', async () => {
    const other = cookieOf(await signIn(app, admin.secret));
    expect((await change({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD, code: fresh() })).status).toBe(204);
    expect(app.ctx.audit.recent()[0]).toMatchObject({ type: 'password_changed' });

    expect((await app.call('GET', '/auth/verify', undefined, as(other))).status).toBe(401);
    expect((await app.call('GET', '/auth/verify', undefined, as(admin.cookie))).status).toBe(200);
    expect((await app.call('POST', '/auth/login', { username: USERNAME, password: PASSWORD })).status).toBe(401);
    expect((await app.call('POST', '/auth/login', { username: USERNAME, password: NEW_PASSWORD })).status).toBe(200);
  });

  it('locks re-authentication after repeated wrong codes', async () => {
    for (let i = 0; i < 5; i += 1) await change({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD, code: '000000' });
    expect((await change({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD, code: fresh() })).status).toBe(429);
  });
});

describe('recovery codes', () => {
  it('are replaced wholesale, invalidating the old set', async () => {
    const response = await app.call('POST', '/auth/account/recovery-codes', { code: fresh() }, as(admin.cookie));
    const { recoveryCodes } = (await response.json()) as { recoveryCodes: string[] };
    expect(recoveryCodes).toHaveLength(10);
    expect(recoveryCodes).not.toEqual(admin.recoveryCodes);

    app.advance(30_000);
    const { challenge } = (await (await app.call('POST', '/auth/login', { username: USERNAME, password: PASSWORD })).json()) as { challenge: string };
    const old = await app.call('POST', '/auth/login/verify', { challenge, code: admin.recoveryCodes[0] });
    expect(old.status).toBe(401);
    const current = await app.call('POST', '/auth/login/verify', { challenge, code: recoveryCodes[0] });
    expect(current.status).toBe(200);
  });

  it('cannot be regenerated without a valid second factor', async () => {
    expect((await app.call('POST', '/auth/account/recovery-codes', { code: '000000' }, as(admin.cookie))).status).toBe(401);
  });
});

describe('request hygiene', () => {
  it('rejects cross-site state changes, even with a valid session', async () => {
    const evil = { ...as(admin.cookie), origin: 'https://evil.example' };
    expect((await app.call('POST', '/auth/account/sessions/revoke-others', {}, evil)).status).toBe(403);
    expect((await app.call('POST', '/auth/logout', {}, { ...as(admin.cookie), 'sec-fetch-site': 'cross-site' })).status).toBe(403);
    expect((await app.call('POST', '/auth/login', { username: USERNAME, password: PASSWORD }, { 'sec-fetch-site': 'same-site' })).status).toBe(403);
    expect((await app.call('GET', '/auth/verify', undefined, as(admin.cookie))).status).toBe(200);
  });

  it('insists on small, well-formed JSON bodies', async () => {
    const send = (body: string, type = 'application/json') =>
      fetch(`${app.url}/auth/login`, { method: 'POST', headers: { 'content-type': type }, body });
    expect((await send('username=a&password=b', 'application/x-www-form-urlencoded')).status).toBe(415);
    expect((await send('{not json')).status).toBe(400);
    expect((await send('[1,2,3]')).status).toBe(400);
    expect((await send(JSON.stringify({ username: USERNAME }))).status).toBe(400);
    expect((await send(JSON.stringify({ username: USERNAME, password: 'x'.repeat(5000) }))).status).toBe(413);
  });

  it('answers unknown routes and methods with 404, and never caches', async () => {
    expect((await app.call('GET', '/auth/login')).status).toBe(404);
    expect((await app.call('DELETE', '/auth/account')).status).toBe(404);
    expect((await app.call('GET', '/auth/../etc/passwd')).status).toBe(404);
    const health = await app.call('GET', '/auth/healthz');
    expect(health.headers.get('cache-control')).toBe('no-store');
    expect(health.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
