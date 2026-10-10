import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { BASE_URL, E2E_PORT, E2E_PROJECT, STORAGE_FILE } from './support/state.ts';

// No page here: these check what the web image does with its settings, so
// they run once rather than once per viewport.

const IMAGE = 'dockerbridge-dashboard:local';
const docker = (...args: string[]): string => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Starts the image with some settings and has nginx print the configuration
 * it would run with. A refused setting stops the container.
 */
function render(settings: Record<string, string>): { started: boolean; output: string } {
  const env = Object.entries(settings).flatMap(([name, value]) => ['-e', `${name}=${value}`]);
  try {
    return { started: true, output: docker('run', '--rm', ...env, IMAGE, 'nginx', '-T') };
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    return { started: false, output: stdout + stderr };
  }
}

test.describe('who may frame the site', () => {
  test('nobody, unless a site is named', async ({ request }) => {
    const headers = (await request.get('/login/')).headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('a named https site, and then the older header steps aside', () => {
    const one = render({ FRAME_ANCESTORS: 'https://portfolio.example.com' });
    expect(one.started).toBe(true);
    expect(one.output).toContain('default "https://portfolio.example.com";');
    expect(one.output).toMatch(/map "" \$x_frame_options \{\s+default "";/);

    const several = render({ FRAME_ANCESTORS: 'self https://portfolio.example.com https://*.example.org' });
    expect(several.output).toContain(`default "'self' https://portfolio.example.com https://*.example.org";`);
    expect(render({ FRAME_ANCESTORS: 'self' }).output).toContain('default "SAMEORIGIN";');
  });

  test('refuses to start with a setting that would let anyone in, or that is not a list of sites', () => {
    const hostile = ['*', 'https://*', 'http://portfolio.example.com', 'none https://a.example.com', 'https://a.example.com; add_header X-Evil 1', 'https://a.example.com/path', "'self'"];
    for (const setting of hostile) {
      const result = render({ FRAME_ANCESTORS: setting });
      expect(result.started, setting).toBe(false);
      expect(result.output, setting).toContain('FRAME_ANCESTORS:');
    }
  });
});

test.describe('whether the showcase is public', () => {
  const flag = (output: string): string | undefined => /map "" \$public_showcase \{\s+default "(\d)";/.exec(output)?.[1];

  test('it is private unless switched on, and the switch takes true or false only', () => {
    expect(flag(render({}).output)).toBe('0');
    for (const on of ['true', 'TRUE', '1', 'yes', 'on']) expect(flag(render({ PUBLIC_SHOWCASE: on }).output), on).toBe('1');
    for (const off of ['false', '0', 'no', 'off', '']) expect(flag(render({ PUBLIC_SHOWCASE: off }).output), off).toBe('0');
    for (const odd of ['maybe', 'public', '1; return 200']) {
      const result = render({ PUBLIC_SHOWCASE: odd });
      expect(result.started, odd).toBe(false);
      expect(result.output, odd).toContain('PUBLIC_SHOWCASE:');
    }
  });

  test('left off, the showcase sits behind sign-in like every other page', async () => {
    // A second web container with the default setting, joined to the running
    // stack so that it asks the same auth service.
    const name = `${E2E_PROJECT}-private`;
    const port = E2E_PORT + 3;
    const base = `http://127.0.0.1:${port}`;
    const get = (path: string, cookie = '') => fetch(base + path, { redirect: 'manual', headers: cookie ? { cookie } : {} });
    try {
      docker('run', '-d', '--name', name, '--network', `${E2E_PROJECT}_edge`, '-p', `127.0.0.1:${port}:8080`, IMAGE);
      docker('network', 'connect', `${E2E_PROJECT}_backend`, name);
      await expect.poll(() => get('/healthz').then((response) => response.status, () => 0), { timeout: 20_000 }).toBe(200);

      // The public stack tells us the name of a real file in the bundle.
      const asset = /\/showcase\/assets\/[\w.-]+\.js/.exec(await (await fetch(`${BASE_URL}/showcase/`)).text())?.[0] ?? '';
      expect(asset).not.toBe('');

      for (const path of ['/', '/showcase/']) {
        const response = await get(path);
        expect(response.status, path).toBe(302);
        expect(response.headers.get('location'), path).toBe(`/login/?next=${path}`);
      }
      for (const path of [asset, '/showcase/brand/favicon.svg', '/showcase/brand/og-image.png']) expect((await get(path)).status, path).toBe(404);

      // With a session it is served, and marked as not for shared caches.
      const cookies = (JSON.parse(readFileSync(STORAGE_FILE, 'utf8')) as { cookies: Array<{ name: string; value: string }> }).cookies;
      const session = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
      const page = await get('/showcase/', session);
      expect(page.status).toBe(200);
      expect(page.headers.get('cache-control')).toBe('private, no-cache');
      expect((await get(asset, session)).headers.get('cache-control')).toBe('private, max-age=31536000, immutable');
    } finally {
      try {
        docker('rm', '-f', name);
      } catch {
        // never started: nothing to remove
      }
    }
  });
});
