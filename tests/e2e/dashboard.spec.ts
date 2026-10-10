import { card, expect, test } from './fixtures';

test.describe('dashboard shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the system status bar and the hero', async ({ page }) => {
    await expect(page).toHaveTitle(/DockerBridge MCP/);
    const status = page.getByRole('region', { name: 'System status' });
    await expect(status).toContainText('MCP Server: ACTIVE (stdio: /var/run/docker.sock)');
    await expect(status).toContainText('Protocol: MCP v1.0');
    await expect(status.getByTestId('latency')).toHaveText(/^\d+ms$/);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Autonomous Container Diagnostics for Agentic Workflows');
    await expect(page.getByText('Token-efficient, safety-guarded Docker Engine debugging built specifically for Claude Code.')).toBeVisible();
  });

  test('animates the hero counters up to their final values', async ({ page }) => {
    const stats = page.getByTestId('hero-stats');
    await stats.scrollIntoViewIfNeeded();
    await expect(stats).toContainText('18,080');
    await expect(stats).toContainText('98%');
    await expect(stats).toContainText('12 ms');
    await expect(stats).toContainText('38 MB');
  });

  test('keeps the latency indicator moving', async ({ page }) => {
    const latency = page.getByTestId('latency');
    const first = await latency.textContent();
    await expect.poll(() => latency.textContent(), { timeout: 15_000 }).not.toBe(first);
  });

  test('"Try Live Simulation" jumps to the simulator and starts a diagnostic', async ({ page }) => {
    await page.getByRole('link', { name: 'Try Live Simulation' }).click();
    await expect(page).toHaveURL(/#simulator$/);
    await expect(page.getByRole('heading', { name: 'Watch Claude Code debug a broken stack' })).toBeInViewport();
    await expect(card(page, 'web-gateway')).toHaveAttribute('data-health', 'degraded');
  });

  test('"Copy MCP Config" puts valid JSON on the clipboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Copy MCP Config' }).click();
    await expect(page.getByRole('button', { name: 'Config copied' })).toBeVisible();
    const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
    expect(copied.mcpServers['docker-debug-bridge'].args).toEqual(['-y', '@your-handle/docker-debug-mcp']);
    expect(copied.mcpServers['docker-debug-bridge'].env.DOCKER_SOCKET_PATH).toBe('/var/run/docker.sock');
  });

  test('"View Architecture" scrolls to the architecture section', async ({ page }) => {
    await page.getByRole('link', { name: 'View Architecture' }).click();
    await expect(page.getByTestId('architecture-flow')).toBeInViewport();
    await expect(page.getByTestId('architecture-flow')).toContainText('JSON-RPC 2.0');
  });

  test('offers a skip link as the first focusable element', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  });

  test('never scrolls sideways', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate Redis OOM Crash' }).click();
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
