import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.ts';
import { loadConfig, type AuthConfig } from './config.ts';
import { createContext, type Context } from './context.ts';
import { totpAt } from './totp.ts';

export const SETUP_TOKEN = 'ABCDE-FGHJK-MNPQR-STVWX';
export const USERNAME = 'operator';
export const PASSWORD = 'violet-harbor-lantern-42';
const STEP_MS = 30_000;

export interface Harness {
  ctx: Context;
  dataDir: string;
  /** Base URL, for requests that must bypass the JSON helper. */
  url: string;
  /** JSON request; pass a cookie string to act as a signed-in browser. */
  call(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<Response>;
  /** Moves the service clock forward. */
  advance(ms: number): void;
  /** A valid authenticator code for the current (advanced) time. */
  code(secret: string): string;
  close(): Promise<void>;
}

/** Boots the real HTTP app on an ephemeral port with a temp data dir and a controllable clock. */
export async function boot(overrides: Partial<AuthConfig> = {}, dataDir?: string): Promise<Harness> {
  const dir = dataDir ?? (await mkdtemp(join(tmpdir(), 'dockerbridge-auth-')));
  let time = Date.parse('2026-10-10T12:00:00Z');
  const config: AuthConfig = {
    ...loadConfig({ AUTH_DATA_DIR: dir, AUTH_SETUP_TOKEN: SETUP_TOKEN }),
    // Cheap hashing keeps the suite fast; production uses DEFAULT_PARAMS.
    scrypt: { logN: 10, r: 8, p: 1 },
    ...overrides,
  };
  const ctx = await createContext(config, { now: () => time });
  const server = createApp(ctx);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    ctx,
    dataDir: dir,
    url: base,
    call: (method, path, body, headers = {}) =>
      fetch(base + path, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    advance: (ms) => {
      time += ms;
    },
    code: (secret) => totpAt(secret, time),
    async close() {
      await new Promise((resolve) => server.close(resolve));
      if (!dataDir) await rm(dir, { recursive: true, force: true });
    },
  };
}

/** The `name=value` pair of the session cookie a response set, for replaying as a Cookie header. */
export function cookieOf(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
}

export interface Onboarded {
  secret: string;
  recoveryCodes: string[];
  cookie: string;
}

/** Runs the whole onboarding flow and returns what the administrator would walk away with. */
export async function onboard(app: Harness): Promise<Onboarded> {
  const enroll = await app.call('POST', '/auth/setup/totp', { token: SETUP_TOKEN, username: USERNAME });
  const { secret } = (await enroll.json()) as { secret: string };
  const done = await app.call('POST', '/auth/setup/complete', {
    token: SETUP_TOKEN,
    username: USERNAME,
    password: PASSWORD,
    code: app.code(secret),
  });
  const { recoveryCodes } = (await done.json()) as { recoveryCodes: string[] };
  return { secret, recoveryCodes, cookie: cookieOf(done) };
}

/** Full two-step sign-in with a fresh authenticator code. */
export async function signIn(app: Harness, secret: string, headers: Record<string, string> = {}): Promise<Response> {
  app.advance(STEP_MS);
  const first = await app.call('POST', '/auth/login', { username: USERNAME, password: PASSWORD }, headers);
  const { challenge } = (await first.json()) as { challenge: string };
  return app.call('POST', '/auth/login/verify', { challenge, code: app.code(secret) }, headers);
}
