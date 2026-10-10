// Captures the images used by the documentation tour and the README.
//
//   npm run screenshots
//
// It starts its own throwaway stack, walks through onboarding with a
// throwaway account, photographs each stage, and removes the stack again.
// The stack's console is limited to the throwaway stack itself and reads a
// sample activity log, so nothing else on this machine ends up in a picture.
// Afterwards rebuild the real stack so the site serves the new images:
//
//   docker compose up -d --build
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { totpAt } from '../auth/totp.ts';
import { writeSampleActivity } from './sample-activity.mjs';
import { startStack, stopStack } from './stack.mjs';

const PROJECT = 'docker-bridge-shots';
const OUT = fileURLToPath(new URL('../public/screenshots/', import.meta.url));
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const ACCOUNT = { username: 'operator', password: 'violet-harbor-lantern-42' };

/** Scrolls a section to the top (respecting the sticky bar) without animating. */
async function show(page, selector) {
  await page.locator(selector).evaluate((node) => node.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForTimeout(500);
}

const save = (page, name) => page.screenshot({ path: `${OUT}${name}.png` });

/** Runs the setup wizard, photographing the authenticator step on the way. */
async function onboard(page, setupToken) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByLabel('Setup token').fill(setupToken);
  await page.getByRole('button', { name: 'Verify token' }).click();
  const account = page.getByTestId('setup-account-step');
  await account.getByLabel('Username').fill(ACCOUNT.username);
  await account.getByLabel('Password', { exact: true }).fill(ACCOUNT.password);
  await account.getByLabel('Confirm password').fill(ACCOUNT.password);
  await account.getByRole('button', { name: 'Continue' }).click();

  const secret = (await page.getByTestId('totp-secret').textContent()).replaceAll(' ', '');
  await page.getByLabel('Code from the app').fill(totpAt(secret, Date.now()));
  await save(page, 'onboarding');
  await page.getByRole('button', { name: 'Verify and create account' }).click();
  await page.getByLabel('I have stored my recovery codes').check();
  await page.getByRole('button', { name: 'Open the console' }).click();
  await page.getByTestId('service-grid').waitFor();
}

/** The signed-in home page: real containers of the throwaway stack. */
async function consoleShots(page) {
  // A second reading, so the CPU and memory gauges show settled values.
  await page.waitForTimeout(9_000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await save(page, 'console-overview');
  await show(page, '#stacks');
  await save(page, 'console-stacks');

  await page.getByTestId('service-dashboard').getByRole('link', { name: 'dashboard' }).click();
  await page.getByLabel(/filter_pattern/).fill('GET /assets/|GET /api/');
  await page.getByRole('button', { name: 'Tail dashboard' }).click();
  await page.getByTestId('tool-result').waitFor();
  await show(page, '#inspect');
  await save(page, 'console-inspect');

  await show(page, '#activity');
  await page.getByTestId('activity-table').waitFor();
  await save(page, 'console-activity');
}

async function showcaseShots(page) {
  await page.goto('/showcase/', { waitUntil: 'networkidle' });
  await page.getByTestId('hero-stats').getByText('18,080').waitFor();
  await page.waitForTimeout(900);
  await save(page, 'dashboard-hero');

  await page.getByRole('button', { name: 'Simulate Redis OOM Crash' }).click();
  await show(page, '#simulator');
  // Let the agent get a few steps in, so the shot shows a diagnostic in flight.
  await page.getByTestId('terminal-output').getByText('docker_tail_filtered_logs').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(700);
  await save(page, 'simulator-redis-oom');

  await show(page, '#economy');
  await page.getByTestId('economy-raw').getByText('18,400').waitFor();
  await save(page, 'token-economy');

  await page.getByRole('tab', { name: 'docker_safe_exec' }).click();
  await page.getByRole('button', { name: /drop table/ }).click();
  await show(page, '#tools');
  await save(page, 'tool-playground');

  await show(page, '#architecture');
  await save(page, 'architecture');

  await show(page, '#setup');
  await save(page, 'setup-any-client');
}

async function otherPages(context) {
  const page = await context.newPage();
  await page.goto('/docs/', { waitUntil: 'networkidle' });
  await save(page, 'docs-overview');
  await show(page, '#tools-reference');
  await save(page, 'docs-tools-reference');

  await page.goto('/account/', { waitUntil: 'networkidle' });
  await page.getByTestId('panel-activity').waitFor();
  await save(page, 'account-security');
  await page.close();
}

async function signedOutShots(browser, baseURL) {
  const desktop = await browser.newContext({ baseURL, viewport: DESKTOP });
  const page = await desktop.newPage();
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(ACCOUNT.username);
  await save(page, 'sign-in');
  await desktop.close();

  const phone = await browser.newContext({ baseURL, viewport: MOBILE, deviceScaleFactor: 2 });
  const small = await phone.newPage();
  await small.goto('/', { waitUntil: 'networkidle' });
  await save(small, 'mobile-sign-in');
  await phone.close();
}

await mkdir(OUT, { recursive: true });
const activityDir = writeSampleActivity(await mkdtemp(join(tmpdir(), 'dockerbridge-shots-')));
const { baseUrl, setupToken } = startStack({ project: PROJECT, port: Number(process.env.SCREENSHOT_PORT ?? 8744), activityDir });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ baseURL: baseUrl, viewport: DESKTOP });
  const page = await context.newPage();
  await onboard(page, setupToken);
  await consoleShots(page);
  await showcaseShots(page);
  await otherPages(context);
  await signedOutShots(browser, baseUrl);
  console.log(`Screenshots written to ${OUT}`);
} finally {
  await browser.close();
  stopStack(PROJECT);
  await rm(activityDir, { recursive: true, force: true });
}
