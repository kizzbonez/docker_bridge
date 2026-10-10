import { card, expect, terminal, test } from './fixtures';

test.describe('live simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('starts with four healthy containers', async ({ page }) => {
    for (const id of ['web-gateway', 'order-api', 'cache-redis', 'db-postgres']) {
      await expect(card(page, id)).toHaveAttribute('data-health', 'healthy');
    }
    await expect(page.getByTestId('container-mesh')).toContainText('all healthy');
    await expect(terminal(page)).toContainText('Pick an incident below');
  });

  test('Redis OOM: the mesh alarms, the agent diagnoses, the fix heals it', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate Redis OOM Crash' }).click();

    const redis = card(page, 'cache-redis');
    await expect(redis).toHaveAttribute('data-health', 'restarting');
    await expect(redis).toContainText('ExitCode: 137 (OOMKilled)');
    await expect(redis).toHaveClass(/animate-alarm/);
    await expect(card(page, 'order-api')).toHaveAttribute('data-health', 'degraded');
    await expect(page.getByRole('img', { name: /order-api to cache-redis: broken/ })).toBeVisible();

    // The transcript streams: the first tool call arrives before the verdict does.
    await expect(terminal(page)).toContainText('docker_get_stack_topology', { timeout: 15_000 });
    await expect(terminal(page)).not.toContainText('Root cause');

    await page.getByRole('button', { name: 'Skip to result' }).click();
    await expect(terminal(page)).toContainText('docker_tail_filtered_logs');
    await expect(terminal(page)).toContainText('docker_safe_exec');
    await expect(terminal(page)).toContainText('mem_limit: 512m');
    await expect(terminal(page)).toContainText('Root cause: cache-redis has no maxmemory');

    await page.getByRole('button', { name: 'Apply fix' }).click();
    await expect(redis).toHaveAttribute('data-health', 'healthy');
    await expect(redis).toContainText('512 MiB');
    await expect(page.getByTestId('container-mesh')).toContainText('all healthy');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(terminal(page)).toContainText('Pick an incident below');
  });

  test('502 outage streams to completion on its own', async ({ page }) => {
    test.setTimeout(90_000);
    await page.getByRole('button', { name: 'Trigger 502 Outage Diagnostic' }).click();
    await expect(card(page, 'web-gateway')).toHaveAttribute('data-health', 'degraded');
    await expect(page.getByRole('img', { name: /web-gateway to order-api: broken/ })).toBeVisible();

    await expect(terminal(page)).toContainText('Root cause: port drift', { timeout: 60_000 });
    await expect(terminal(page)).toContainText('"method": "tools/call"');
    await expect(terminal(page)).toContainText('server order-api:8081;');
    await expect(page.getByRole('button', { name: 'Apply fix' })).toBeEnabled();
  });

  test('DB connection test reports pool exhaustion', async ({ page }) => {
    await page.getByRole('button', { name: 'Run DB Connection Test' }).click();
    await expect(card(page, 'db-postgres')).toHaveAttribute('data-health', 'degraded');
    await page.getByRole('button', { name: 'Skip to result' }).click();
    await expect(terminal(page)).toContainText('pg_isready -h localhost -p 5432');
    await expect(terminal(page)).toContainText('97 of 100 slots in use');
    await expect(terminal(page)).toContainText('DB_POOL_MAX: "20"');
  });

  test('gauges update in real time', async ({ page }) => {
    const api = card(page, 'order-api');
    const first = await api.textContent();
    await expect.poll(() => api.textContent(), { timeout: 15_000 }).not.toBe(first);
  });

  test('selecting a container opens it in the inspector', async ({ page }) => {
    await page.getByRole('button', { name: 'cache-redis' }).click();
    const inspector = page.getByTestId('container-inspector');
    await expect(inspector).toContainText('docker inspect cache-redis');
    await expect(inspector).toContainText('redis:7.4-alpine');
  });
});

test.describe('live simulator with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows the full transcript immediately', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Simulate Redis OOM Crash' }).click();
    await expect(terminal(page)).toContainText('Root cause: cache-redis has no maxmemory', { timeout: 2_000 });
    await expect(page.getByRole('button', { name: 'Skip to result' })).toBeDisabled();
  });
});
