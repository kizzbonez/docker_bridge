// Captures the images used by the documentation tour and the README.
//
//   npm run screenshots
//
// It starts its own throwaway stack, walks through onboarding with a
// throwaway account, photographs each stage, and removes the stack again.
// Afterwards rebuild the real stack so the site serves the new images:
//
//   docker compose up -d --build
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { totpAt } from '../auth/totp.ts';
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
  await page.getByRole('button', { name: 'Open the dashboard' }).click();
  await page.getByTestId('hero-stats').getByText('18,080').waitFor();
}

async function dashboardShots(page) {
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
const { baseUrl, setupToken } = startStack({ project: PROJECT, port: Number(process.env.SCREENSHOT_PORT ?? 8744) });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ baseURL: baseUrl, viewport: DESKTOP });
  const page = await context.newPage();
  await onboard(page, setupToken);
  await dashboardShots(page);
  await otherPages(context);
  await signedOutShots(browser, baseUrl);
  console.log(`Screenshots written to ${OUT}`);
} finally {
  await browser.close();
  stopStack(PROJECT);
}
