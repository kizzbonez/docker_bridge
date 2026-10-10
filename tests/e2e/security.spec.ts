import { test as plain } from '@playwright/test';
import { expect, expectAccessible, test } from './fixtures';

const PAGES = ['/', '/showcase/', '/docs/', '/account/'];

test.describe('accessibility (axe)', () => {
  for (const path of PAGES) {
    test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
      await page.goto(path);
      await expectAccessible(page);
    });
  }

  test('the showcase stays accessible during an incident', async ({ page }) => {
    await page.goto('/showcase/');
    await page.getByRole('button', { name: 'Simulate Redis OOM Crash' }).click();
    await page.getByRole('button', { name: 'Skip to result' }).click();
    await page.getByRole('tab', { name: 'docker_safe_exec' }).click();
    await expectAccessible(page);
  });
});

test.describe('network hygiene', () => {
  for (const path of PAGES) {
    test(`${path} only talks to its own origin`, async ({ page, baseURL }) => {
      const origins = new Set<string>();
      page.on('request', (request) => origins.add(new URL(request.url()).origin));
      await page.goto(path, { waitUntil: 'networkidle' });
      expect([...origins]).toEqual([new URL(baseURL ?? '').origin]);
    });
  }
});

// Raw HTTP checks: no page, so the console-error fixture does not apply.
plain.describe('response headers and server hardening', () => {
  for (const path of [...PAGES, '/healthz', '/brand/favicon.svg', '/missing-page', '/login/', '/auth/status']) {
    plain(`${path} carries the full security header set`, async ({ request }) => {
      const headers = (await request.get(path)).headers();
      expect(headers['content-security-policy']).toContain("default-src 'none'");
      expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(headers['content-security-policy']).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:/);
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBe('no-referrer');
      expect(headers['cross-origin-opener-policy']).toBe('same-origin');
      expect(headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(headers['permissions-policy']).toContain('camera=()');
      expect(headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(headers['server']).toBe('nginx');
    });
  }

  plain('keeps protected content out of shared caches', async ({ request }) => {
    const html = await request.get('/');
    expect(html.headers()['cache-control']).toBe('private, no-cache');
    const asset = /\/assets\/[\w.-]+\.js/.exec(await html.text())?.[0] ?? '';
    expect(asset).not.toBe('');
    expect((await request.get(asset)).headers()['cache-control']).toBe('private, max-age=31536000, immutable');
    expect((await request.get('/login/')).headers()['cache-control']).toBe('no-store');
    expect((await request.get('/auth/status')).headers()['cache-control']).toBe('no-store');
  });

  plain('refuses write methods, except the one the console API takes', async ({ request }) => {
    for (const send of [request.post, request.put, request.delete, request.patch]) {
      expect((await send.call(request, '/')).status()).toBe(405);
    }
    for (const path of ['/api/engine', '/api/activity', '/api/tools/call/extra', '/api/tools']) {
      expect((await request.post(path, { data: {} })).status(), path).toBe(405);
    }
    for (const send of [request.put, request.delete, request.patch]) {
      expect((await send.call(request, '/api/tools/call')).status()).toBe(405);
    }
  });

  plain('never serves dotfiles or source', async ({ request }) => {
    for (const path of ['/.env', '/.git/config', '/.dockerignore', '/package.json', '/src/main.tsx', '/Dockerfile']) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  plain('does not follow path traversal out of the web root', async ({ request }) => {
    for (const path of ['/..%2f..%2fetc/passwd', '/assets/..%2f..%2f..%2fetc%2fpasswd', '/%2e%2e/%2e%2e/etc/passwd']) {
      const response = await request.get(path);
      expect([400, 404], path).toContain(response.status());
      expect(await response.text()).not.toContain('root:');
    }
  });

  plain('answers the health check', async ({ request }) => {
    const response = await request.get('/healthz');
    expect(response.status()).toBe(200);
    expect(await response.text()).toBe('ok\n');
  });

  plain('redirects /docs without leaking the internal port', async ({ request }) => {
    const response = await request.get('/docs', { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe('/docs/');
  });
});
