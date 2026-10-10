import type { Page } from '@playwright/test';
import { expect, expectAccessible, test } from './fixtures';
import { E2E_PROJECT } from './support/state.ts';

// The throwaway stack's console is limited to the stack itself, so these
// tests read real containers (dashboard, auth, console) on a real engine.
const SERVICES = ['dashboard', 'auth', 'console'];

const service = (page: Page, name: string) => page.getByTestId(`service-${name}`);

/** Opens the console and waits until the stack has been read from the engine. */
async function open(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('service-grid')).toBeVisible({ timeout: 30_000 });
}

test.describe('live console', () => {
  test.beforeEach(async ({ page }) => open(page));

  test('is the signed-in home page, and reports the real engine', async ({ page }) => {
    await expect(page).toHaveTitle('Console — DockerBridge MCP');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your Docker Engine, as your agents see it.');
    const status = page.getByRole('region', { name: 'Engine status' });
    await expect(status).toContainText(/Docker Engine \d+\.\d+/);
    await expect(status.getByTestId('running-count')).toHaveText('3 / 3');
    await expect(status).toContainText('bridge: read-only');
    await expect(status).toContainText(`scope ${E2E_PROJECT}`);
    await expect(status).toContainText('live data');
    await expect(page.getByText('simulated data')).toHaveCount(0);
  });

  test('shows its own stack as the engine reports it: health, memory and dependencies', async ({ page }) => {
    await expect(page.getByRole('tab', { name: `${E2E_PROJECT} 3/3` })).toHaveAttribute('aria-selected', 'true');
    for (const name of SERVICES) await expect(service(page, name)).toHaveAttribute('data-health', 'healthy');
    await expect(service(page, 'dashboard')).toContainText('needs auth');
    await expect(service(page, 'console')).toContainText('needs auth');
    // Gauges arrive with the second, fuller reading: the engine samples CPU for it.
    await expect(service(page, 'auth').getByRole('meter', { name: 'auth memory in MiB' })).toHaveAttribute('aria-valuemax', '192', { timeout: 20_000 });
    await expect(page.getByTestId('overview')).toContainText('Containers running3of 3 containers visible');
  });

  test('pauses and resumes refreshing', async ({ page }) => {
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByText('paused')).toBeVisible();
    await expect(service(page, 'auth')).toBeVisible();
    await page.getByRole('button', { name: 'Resume' }).click();
    await expect(page.getByText('refreshing every 8 s')).toBeVisible();
  });

  test('tails a real container log through the filter', async ({ page }) => {
    await service(page, 'dashboard').getByRole('link', { name: 'dashboard' }).click();
    await expect(page.getByRole('combobox', { name: /container/ })).toHaveValue('dashboard');
    await page.getByLabel(/filter_pattern/).fill('GET /assets/');
    await page.getByRole('button', { name: 'Tail dashboard' }).click();

    const result = page.getByTestId('tool-result');
    await expect(result).toContainText(/\d+ scanned · \d+ matched · \d+ returned/);
    await expect(result).toContainText(/≈ [\d,]+ → [\d,]+ tokens/);
    const lines = result.getByRole('group', { name: /Filtered log of/ }).getByRole('listitem');
    await expect(lines.first()).toContainText('GET /assets/');
  });

  test('refuses a filter that could backtrack forever', async ({ page }) => {
    await page.getByLabel(/filter_pattern/).fill('(a+)+$');
    await page.getByRole('button', { name: /^Tail / }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'the request was not accepted' })).toBeVisible();
  });

  test('will not run a command in its own stack', async ({ page }) => {
    await page.getByRole('tab', { name: 'docker_safe_exec' }).click();
    await expect(page.getByText("this is the console's own stack")).toBeVisible();
    await page.getByRole('combobox', { name: /container/ }).selectOption('auth');
    await page.getByRole('textbox', { name: /^command/ }).fill('cat /data/account.json');
    await page.getByRole('button', { name: 'Run in auth' }).click();

    const result = page.getByTestId('tool-result');
    await expect(result).toContainText('blocked');
    await expect(result.getByTestId('guardrail')).toContainText('does not run commands in its own stack');
    await expect(result).not.toContainText('passwordHash');
  });

  test('lists what agents asked for, by client', async ({ page }) => {
    const table = page.getByTestId('activity-table');
    await table.scrollIntoViewIfNeeded();
    for (const client of ['claude-code 2.1.288', 'cursor-vscode 1.9.2', 'codex-cli 0.48.0', 'gemini-cli 0.9.1']) {
      await expect(table.getByRole('cell', { name: client, exact: true }).first()).toBeVisible();
    }
    const refused = table.getByRole('row').filter({ hasText: 'nginx -s reload' });
    await expect(refused).toContainText('refused');
    await expect(table.getByRole('row').filter({ hasText: 'error|timeout|refused' })).toContainText('18,400 → 320');
    await expect(page.getByTestId('activity-totals')).toContainText(/tokens saved/);
  });

  test('puts a log read from this page on the record', async ({ page }) => {
    await page.getByLabel(/filter_pattern/).fill('healthz');
    await page.getByRole('button', { name: /^Tail / }).click();
    await expect(page.getByTestId('tool-result')).toBeVisible();
    const mine = page.getByTestId('activity-table').getByRole('row').filter({ hasText: 'web console' }).filter({ hasText: 'healthz' });
    await expect(mine.first()).toBeVisible({ timeout: 20_000 });
  });

  test('is accessible once loaded, with a result on screen', async ({ page }) => {
    await page.getByRole('button', { name: /^Tail / }).click();
    await expect(page.getByTestId('tool-result')).toBeVisible();
    await expectAccessible(page);
  });

  test('never scrolls sideways', async ({ page }) => {
    await page.getByRole('tab', { name: 'docker_safe_exec' }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('links to the documentation', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Docs' }).click();
    await expect(page).toHaveURL(/\/docs\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Documentation' })).toBeVisible();
  });
});

test.describe('console API', () => {
  test('serves the signed-in administrator, and no other site', async ({ page }) => {
    const engine = await page.request.get('/api/engine');
    expect(engine.status()).toBe(200);
    expect(engine.headers()['cache-control']).toBe('no-store');
    expect(await engine.json()).toMatchObject({ reachable: true, bridge: { readOnly: true, selfProject: E2E_PROJECT, scope: [E2E_PROJECT] } });

    const call = { name: 'docker_get_stack_topology', arguments: { project: E2E_PROJECT } };
    expect((await page.request.post('/api/tools/call', { data: call })).status()).toBe(200);
    const forged = await page.request.post('/api/tools/call', { data: call, headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' } });
    expect(forged.status()).toBe(403);
    const form = await page.request.post('/api/tools/call', { form: { name: 'docker_safe_exec' } });
    expect(form.status()).toBe(415);
  });

  test('cannot see or touch anything outside its scope', async ({ page }) => {
    const reply = await page.request.post('/api/tools/call', { data: { name: 'docker_get_stack_topology', arguments: { project: 'docker-bridge' } } });
    expect(await reply.json()).toMatchObject({ isError: true, structured: { error: expect.stringContaining('no containers found') } });
    const bad = await page.request.post('/api/tools/call', { data: { name: 'docker_rm', arguments: {} } });
    expect(bad.status()).toBe(400);
  });
});
