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

const login = (username: string, password: string, headers?: Record<string, string>) =>
  app.call('POST', '/auth/login', { username, password }, headers);

async function challengeFor(): Promise<string> {
  app.advance(30_000);
  const { challenge } = (await (await login(USERNAME, PASSWORD)).json()) as { challenge: string };
  return challenge;
}

describe('password step', () => {
  it('answers a wrong password and an unknown user identically', async () => {
    const wrongPassword = await login(USERNAME, 'not-the-password-1');
    const unknownUser = await login('nobody', PASSWORD);
    expect([wrongPassword.status, unknownUser.status]).toEqual([401, 401]);
    expect(await wrongPassword.json()).toEqual(await unknownUser.json());
    expect(wrongPassword.headers.get('set-cookie')).toBeNull();
  });

  it('issues a challenge, not a session, for the right password', async () => {
    const response = await login(USERNAME.toUpperCase(), PASSWORD);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ next: 'second_factor', challenge: expect.any(String) });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('locks one client+username pair after five failures, without touching others', async () => {
    for (let i = 0; i < 5; i += 1) expect((await login(USERNAME, 'wrong-password-xyz')).status).toBe(401);
    const locked = await login(USERNAME, PASSWORD);
    expect(locked.status).toBe(429);
    expect(await locked.json()).toMatchObject({ error: 'locked', retryAfter: expect.any(Number) });
    expect((await login(USERNAME, PASSWORD, { 'x-real-ip': '10.1.1.1' })).status).toBe(200);
    expect(app.ctx.audit.recent().some((event) => event.type === 'lockout')).toBe(true);
    app.advance(15 * 60_000 + 1);
    expect((await login(USERNAME, PASSWORD)).status).toBe(200);
  });
});

describe('second factor', () => {
  it('signs in with a fresh authenticator code and sets a hardened cookie', async () => {
    const response = await signIn(app, admin.secret);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: USERNAME, usedRecoveryCode: false, recoveryCodesLeft: 10 });
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/^db_session=[\w-]{43}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=43200$/);
    expect((await app.call('GET', '/auth/verify', undefined, { cookie: cookieOf(response) })).headers.get('x-auth-user')).toBe(USERNAME);
  });

  it('marks the cookie Secure behind HTTPS', async () => {
    const response = await signIn(app, admin.secret, { 'x-forwarded-proto': 'https' });
    expect(response.headers.get('set-cookie')).toMatch(/; Secure$/);
  });

  it('refuses a code that was already used', async () => {
    app.advance(30_000);
    const code = app.code(admin.secret);
    const first = (await (await login(USERNAME, PASSWORD)).json()) as { challenge: string };
    expect((await app.call('POST', '/auth/login/verify', { challenge: first.challenge, code })).status).toBe(200);
    const second = (await (await login(USERNAME, PASSWORD)).json()) as { challenge: string };
    const replay = await app.call('POST', '/auth/login/verify', { challenge: second.challenge, code });
    expect(replay.status).toBe(401);
    expect(await replay.json()).toEqual({ error: 'invalid_code' });
  });

  it('accepts each recovery code exactly once', async () => {
    const code = admin.recoveryCodes[0] ?? '';
    const first = await app.call('POST', '/auth/login/verify', { challenge: await challengeFor(), code });
    expect(await first.json()).toEqual({ user: USERNAME, usedRecoveryCode: true, recoveryCodesLeft: 9 });
    const again = await app.call('POST', '/auth/login/verify', { challenge: await challengeFor(), code });
    expect(again.status).toBe(401);
    expect(app.ctx.audit.recent().some((event) => event.type === 'recovery_code_used')).toBe(true);
  });

  it('burns a challenge after too many guesses or five minutes', async () => {
    // A generous lockout threshold isolates the per-challenge limit under test.
    await app.close();
    app = await boot({ maxFailures: 50 });
    admin = await onboard(app);
    const guessed = await challengeFor();
    for (let i = 0; i < 5; i += 1) {
      expect(await (await app.call('POST', '/auth/login/verify', { challenge: guessed, code: '000000' })).json()).toEqual({ error: 'invalid_code' });
    }
    const spent = await app.call('POST', '/auth/login/verify', { challenge: guessed, code: app.code(admin.secret) });
    expect(await spent.json()).toEqual({ error: 'challenge_expired' });

    const stale = await challengeFor();
    app.advance(5 * 60_000 + 1);
    const late = await app.call('POST', '/auth/login/verify', { challenge: stale, code: app.code(admin.secret) });
    expect(await late.json()).toEqual({ error: 'challenge_expired' });
  });

  it('binds a challenge to the client that earned it', async () => {
    const stolen = await app.call('POST', '/auth/login/verify', { challenge: await challengeFor(), code: app.code(admin.secret) }, { 'x-real-ip': '203.0.113.9' });
    expect(await stolen.json()).toEqual({ error: 'challenge_expired' });
  });

  it('locks out second-factor guessing across challenges', async () => {
    for (let i = 0; i < 5; i += 1) {
      await app.call('POST', '/auth/login/verify', { challenge: await challengeFor(), code: '000000' });
    }
    const locked = await app.call('POST', '/auth/login/verify', { challenge: await challengeFor(), code: app.code(admin.secret) });
    expect(locked.status).toBe(429);
  });
});

describe('sessions', () => {
  it('expire when idle and at their absolute lifetime', async () => {
    const cookie = cookieOf(await signIn(app, admin.secret));
    const verify = () => app.call('GET', '/auth/verify', undefined, { cookie });
    app.advance(119 * 60_000);
    expect((await verify()).status).toBe(200);
    app.advance(121 * 60_000);
    expect((await verify()).status).toBe(401);

    const kept = cookieOf(await signIn(app, admin.secret));
    for (let hour = 0; hour < 11; hour += 1) {
      app.advance(60 * 60_000);
      expect((await app.call('GET', '/auth/verify', undefined, { cookie: kept })).status).toBe(200);
    }
    app.advance(61 * 60_000);
    expect((await app.call('GET', '/auth/verify', undefined, { cookie: kept })).status).toBe(401);
  });

  it('end on logout, which also clears the cookie', async () => {
    const cookie = cookieOf(await signIn(app, admin.secret));
    const out = await app.call('POST', '/auth/logout', undefined, { cookie });
    expect(out.status).toBe(204);
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await app.call('GET', '/auth/verify', undefined, { cookie })).status).toBe(401);
  });

  it('reject forged and garbage cookies', async () => {
    for (const cookie of ['db_session=', 'db_session=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'other=1', 'db_session=../../etc/passwd']) {
      expect((await app.call('GET', '/auth/verify', undefined, { cookie })).status, cookie).toBe(401);
    }
  });
});
