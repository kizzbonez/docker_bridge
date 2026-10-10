// Measures how the whole chain (nginx, auth, console, engine) answers when
// many console pages poll at once.
//
//   node scripts/load-check.mjs
//
// It starts a throwaway stack, creates a throwaway account through the same
// API the onboarding wizard uses, then loads 1, 6 and 12 pages' worth of
// requests at once and prints the latencies. The stack is removed afterwards.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { totpAt } from '../auth/totp.ts';
import { writeSampleActivity } from './sample-activity.mjs';
import { startStack, stopStack } from './stack.mjs';

const PROJECT = 'docker-bridge-load';
const ACCOUNT = { username: 'operator', password: 'violet-harbor-lantern-42' };
const JSON_HEADERS = { 'content-type': 'application/json' };

/** Onboards through the API and returns the session cookie. */
async function signIn(baseUrl, token) {
  const post = (path, body) => fetch(baseUrl + path, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) });
  const { secret } = await (await post('/auth/setup/totp', { token, username: ACCOUNT.username })).json();
  const done = await post('/auth/setup/complete', { token, ...ACCOUNT, code: totpAt(secret, Date.now()) });
  if (!done.ok) throw new Error(`onboarding failed: ${done.status}`);
  return (done.headers.get('set-cookie') ?? '').split(';')[0];
}

async function timed(label, run) {
  const startedAt = Date.now();
  try {
    const response = await run();
    await response.text();
    return { label, ms: Date.now() - startedAt, status: response.status };
  } catch (error) {
    return { label, ms: Date.now() - startedAt, status: `ERR ${error.cause?.code ?? error.message}` };
  }
}

function report(results) {
  const labels = [...new Set(results.map((result) => result.label))];
  for (const label of labels) {
    const list = results.filter((result) => result.label === label);
    const times = list.map((entry) => entry.ms).sort((a, b) => a - b);
    const odd = [...new Set(list.filter((entry) => entry.status !== 200).map((entry) => entry.status))];
    console.log(`  ${label.padEnd(18)} n=${String(list.length).padEnd(3)} median=${times[Math.floor(times.length / 2)]}ms max=${times.at(-1)}ms ${odd.length ? `NOT 200: ${odd.join(',')}` : ''}`);
  }
}

async function measure(baseUrl, cookie) {
  const get = (label, path) => timed(label, () => fetch(baseUrl + path, { headers: { cookie } }));
  const topology = (metrics) =>
    timed(metrics ? 'topology+metrics' : 'topology', () =>
      fetch(`${baseUrl}/api/tools/call`, {
        method: 'POST',
        headers: { ...JSON_HEADERS, cookie },
        body: JSON.stringify({ name: 'docker_get_stack_topology', arguments: { project: PROJECT, include_metrics: metrics, include_stopped: true } }),
      }),
    );
  const page = () => [get('page', '/'), get('auth status', '/auth/status'), get('engine', '/api/engine'), get('activity', '/api/activity'), topology(false), topology(true)];

  for (const pages of [1, 6, 12]) {
    console.log(`${pages} page(s) loading at once, three rounds a second apart:`);
    const results = [];
    for (let round = 0; round < 3; round += 1) {
      results.push(...(await Promise.all(Array.from({ length: pages }, page).flat())));
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    report(results);
  }
}

const activityDir = writeSampleActivity(await mkdtemp(join(tmpdir(), 'dockerbridge-load-')));
const { baseUrl, setupToken } = startStack({ project: PROJECT, port: Number(process.env.LOAD_PORT ?? 8745), activityDir });
try {
  await measure(baseUrl, await signIn(baseUrl, setupToken));
} finally {
  stopStack(PROJECT);
  await rm(activityDir, { recursive: true, force: true });
}
