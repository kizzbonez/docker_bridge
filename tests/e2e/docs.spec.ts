import { expect, test } from './fixtures';

const SECTIONS = [
  'Overview',
  'Quick start',
  'Configuration',
  'Tools reference',
  'Guardrails',
  'Log pipeline',
  'Live console',
  'Tour',
  'Run the stack',
  'Sign-in & onboarding',
  'Security posture',
  'Project layout',
  'Troubleshooting',
];

test.describe('documentation page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs/');
  });

  test('has a title, a hero and every section', async ({ page }) => {
    await expect(page).toHaveTitle('Documentation — DockerBridge MCP');
    await expect(page.getByRole('heading', { level: 1, name: 'Documentation' })).toBeVisible();
    for (const name of SECTIONS) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
    }
  });

  test('sidebar links navigate and track the section being read', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Documentation sections' });
    await nav.getByRole('link', { name: 'Guardrails' }).click();
    await expect(page).toHaveURL(/#guardrails$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Guardrails' })).toBeInViewport();
    await expect(nav.getByRole('link', { name: 'Guardrails' })).toHaveAttribute('aria-current', 'location');
  });

  test('renders the tool reference from the schemas', async ({ page }) => {
    const logs = page.getByTestId('tool-ref-docker_tail_filtered_logs');
    await expect(logs.getByRole('rowheader', { name: 'filter_pattern' })).toBeVisible();
    await expect(logs.getByRole('table')).toContainText('64–4096 · default 320');
    await expect(logs.getByLabel('request · tools/call')).toContainText('"name": "docker_tail_filtered_logs"');
    await expect(page.getByTestId('allowed-binaries')).toContainText('pg_isready');
    await expect(page.getByRole('table', { name: 'Exec policy rules' })).toContainText('nginx -s reload');
  });

  test('code samples can be copied', async ({ page }) => {
    const sample = page.locator('figure', { hasText: '~/.claude.json' }).first();
    await sample.getByRole('button', { name: 'Copy' }).click();
    await expect(sample.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('"docker-debug-bridge"');
  });

  test('tour screenshots load', async ({ page }) => {
    const images = page.getByTestId('tour').getByRole('img');
    await expect(images).toHaveCount(10);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth)).toBeGreaterThan(1000);
    }
  });

  test('troubleshooting answers expand', async ({ page }) => {
    const question = page.getByText('npx fails to start the server on Windows');
    await question.click();
    await expect(page.getByText(/launch npx through the command interpreter/)).toBeVisible();
  });

  test('never scrolls sideways', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('shows the real engine in its status bar, and links back to the console', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Engine status' })).toContainText(/Docker Engine \d+\./, { timeout: 20_000 });
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Console' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your Docker Engine, as your agents see it.');
  });
});
