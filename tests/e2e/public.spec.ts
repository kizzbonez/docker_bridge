import { card, expect, expectAccessible, test } from './fixtures';
import { ANONYMOUS } from './support/state.ts';

// The throwaway stack runs with PUBLIC_SHOWCASE on. Every test here is a
// visitor: no session, no cookies.
test.use({ storageState: ANONYMOUS });

const REPO = 'https://github.com/kizzbonez/docker_bridge';

test.describe('the public showcase', () => {
  test('is what a visitor gets at the home page, and says it is a simulation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/showcase\/$/);
    await expect(page).toHaveTitle('Showcase — DockerBridge MCP');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Autonomous Container Diagnostics for Agentic Workflows');
    await expect(page.getByRole('region', { name: 'System status' })).toContainText('simulated data');
    await expect(page.getByText('live data')).toHaveCount(0);
  });

  test('offers sign-in, and no link into pages a visitor cannot open', async ({ page }) => {
    await page.goto('/showcase/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Console' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Docs' })).toHaveCount(0);
    await expect(page.getByTestId('session-menu')).toHaveCount(0);

    const guide = page.getByRole('link', { name: /Read the full setup guide on GitHub/ });
    await expect(guide).toHaveAttribute('href', `${REPO}#connect-an-mcp-client`);
    await expect(guide).toHaveAttribute('target', '_blank');
    const footer = page.getByRole('navigation', { name: 'Footer' }).getByRole('link');
    expect(await footer.evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual([`${REPO}#readme`, REPO, '/login/']);
  });

  test('runs the whole simulation without an account', async ({ page }) => {
    await page.goto('/showcase/');
    await page.getByRole('link', { name: 'Try Live Simulation' }).click();
    await expect(card(page, 'web-gateway')).toHaveAttribute('data-health', 'degraded');
    await page.getByRole('tab', { name: 'docker_safe_exec' }).click();
    await expect(page.getByTestId('tool-status')).toBeVisible();
    await page.locator('#setup').scrollIntoViewIfNeeded();
    await expect(page.locator('#setup ol h3').first()).toHaveText('Clone the repository');
  });

  test('leads to sign-in from its navigation', async ({ page }) => {
    await page.goto('/showcase/');
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to the console');
  });

  test('has no WCAG A/AA violations and never scrolls sideways', async ({ page }) => {
    await page.goto('/showcase/');
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expectAccessible(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('what a public showcase does not open up', () => {
  test('every other page still asks for sign-in, and the API still answers 401', async ({ request }) => {
    for (const path of ['/docs/', '/account/', '/docs/index.html']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(302);
      expect(response.headers()['location'], path).toBe(`/login/?next=${path}`);
    }
    for (const path of ['/api/engine', '/api/activity']) expect((await request.get(path)).status(), path).toBe(401);
    const call = await request.post('/api/tools/call', { data: { name: 'docker_get_stack_topology', arguments: { project: 'x' } } });
    expect(call.status()).toBe(401);
    for (const path of ['/index.html', '/assets/', '/screenshots/console-stacks.png', '/brand/og-image.png', '/showcase/../docs/index.html']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([302, 404], path).toContain(response.status());
      expect(await response.text(), path).not.toContain('Live console');
    }
  });

  test('serves only the showcase bundle, which holds none of the console', async ({ request }) => {
    const page = await request.get('/showcase/');
    expect(page.status()).toBe(200);
    expect(page.headers()['cache-control']).toBe('public, no-cache');
    expect(page.headers()['content-security-policy']).toContain("default-src 'none'");

    const html = await page.text();
    const files = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((match) => match[1] ?? '');
    expect(files.length).toBeGreaterThan(2);
    for (const file of files) expect(file, 'everything the page loads comes from its own folder').toMatch(/^\/showcase\//);

    for (const file of files.filter((path) => path.endsWith('.js'))) {
      const script = await request.get(file);
      expect(script.status(), file).toBe(200);
      expect(script.headers()['cache-control'], file).toBe('public, max-age=31536000, immutable');
      const code = await script.text();
      // The console's API client is the tell: the bundle must not contain it.
      // (The auth client is here, as it is in the sign-in portal: the page asks who is signed in.)
      for (const marker of ['/api/engine', '/api/tools/call', '/api/activity']) expect(code.includes(marker), `${file} mentions ${marker}`).toBe(false);
    }
    expect((await request.get('/showcase/brand/og-image.png')).status()).toBe(200);
  });
});
