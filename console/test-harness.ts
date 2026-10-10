import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach } from 'vitest';
import { containerId, startFakeEngine, type FakeContainer, type FakeEngine } from '../bridge/test-support/fake-engine.ts';
import { createApp } from './app.ts';
import { loadConsoleConfig, type ConsoleConfig } from './config.ts';
import { createContext } from './context.ts';

/** The id of the container the console itself runs in. */
export const SELF = containerId('console');

const compose = (project: string, service: string) => ({ 'com.docker.compose.project': project, 'com.docker.compose.service': service });

/** A shop stack, a stray container, and the console's own stack. */
export const CONTAINERS: FakeContainer[] = [
  { id: containerId('web'), name: 'shop-web-1', image: 'nginx:1.30', state: 'running', labels: compose('shop', 'web'), log: ['[error] upstream refused', 'GET /healthz 200', 'GET /healthz 200'], exec: (argv) => ({ stdout: `ran ${argv.join(' ')}\n` }) },
  { id: containerId('db'), name: 'shop-db-1', image: 'postgres:17', state: 'exited', labels: compose('shop', 'db') },
  { id: containerId('lonely'), name: 'lonely', image: 'alpine:3', state: 'running', labels: {} },
  { id: containerId('auth'), name: 'docker-bridge-auth-1', image: 'dockerbridge-auth:local', state: 'running', labels: compose('docker-bridge', 'auth'), exec: () => ({ stdout: 'the account file\n' }) },
  { id: SELF, name: 'docker-bridge-console-1', image: 'dockerbridge-console:local', state: 'running', labels: compose('docker-bridge', 'console'), inspect: { State: { Status: 'running' }, Config: { Labels: compose('docker-bridge', 'console') } } },
];

/** A parsed reply. Tests reach into it freely, so it is loosely typed on purpose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Reply = Record<string, any>;

export interface Booted {
  url: string;
  fake: FakeEngine;
  /** Every audit line the service wrote. */
  audit: string[];
  call(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<Response>;
}

let cleanup: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  for (const step of cleanup.reverse()) await step();
  cleanup = [];
});

/** Runs after the current test, in reverse order of registration. */
export const later = (step: () => Promise<unknown>): void => void cleanup.push(step);

export async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  later(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

export async function fakeEngine(): Promise<FakeEngine> {
  const fake = await startFakeEngine(CONTAINERS);
  later(() => fake.close());
  return fake;
}

/** The real HTTP app, on an ephemeral port, in front of a fake engine. */
export async function boot(overrides: Partial<ConsoleConfig> = {}, signedIn = true): Promise<Booted> {
  const fake = await fakeEngine();
  const base = loadConsoleConfig({ DOCKER_SOCKET_PATH: fake.socketPath, HOSTNAME: SELF });
  const audit: string[] = [];
  const ctx = createContext({ ...base, ...overrides }, (line) => audit.push(line), {
    session: async () => (signedIn ? 'operator' : null),
    now: () => new Date('2026-10-10T12:00:00Z'),
  });
  const url = await listen(createApp(ctx));
  return {
    url,
    fake,
    audit,
    call: (method, path, body, headers = {}) =>
      fetch(url + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }),
  };
}

export const tool = (app: Booted, name: string, args: unknown, headers?: Record<string, string>): Promise<Response> =>
  app.call('POST', '/api/tools/call', { name, arguments: args }, headers);

export const json = async (response: Response): Promise<Reply> => (await response.json()) as Reply;
