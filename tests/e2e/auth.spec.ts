import type { Page } from '@playwright/test';
import { expect, expectAccessible, test } from './fixtures';
import { ANONYMOUS, freshCode, readAdmin, takeRecoveryCode, writeAdmin } from './support/state.ts';

// Every test starts signed out, and the file runs in order: later tests change
// the account (codes, password) that earlier ones rely on.
test.use({ storageState: ANONYMOUS });
test.describe.configure({ mode: 'serial' });

async function enterPassword(page: Page, username: string, password: string): Promise<void> {
  const form = page.getByTestId('login-password-step');
  await form.getByLabel('Username').fill(username);
  await form.getByLabel('Password', { exact: true }).fill(password);
  await form.getByRole('button', { name: 'Continue' }).click();
}

/** Full sign-in through the UI, spending one recovery code as the second factor. */
async function signInWithRecoveryCode(page: Page, path = '/login/'): Promise<void> {
  const admin = readAdmin();
  await page.goto(path);
  await enterPassword(page, admin.username, admin.password);
  await page.getByRole('button', { name: 'Use a recovery code instead' }).click();
  await page.getByLabel('Recovery code').fill(takeRecoveryCode());
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
}

test.describe('the sign-in wall', () => {
  test('sends anonymous page requests to sign-in and hides every protected file', async ({ request }) => {
    for (const path of ['/', '/docs/', '/account/', '/docs/index.html']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(302);
      expect(response.headers()['location'], path).toBe(`/login/?next=${path}`);
      expect(response.headers()['cache-control']).toBe('no-store');
    }
    // Real files and scanner bait alike: a 404, never a redirect to a 200 page.
    const files = ['/brand/logo-mark.svg', '/screenshots/dashboard-hero.png', '/assets/dashboard.js', '/backup.sql', '/settings.py', '/docker-compose.yml', '/wp-login.php'];
    for (const path of files) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).not.toContain('<div id="root">');
    }
    expect((await request.get('/auth/account')).status()).toBe(401);
    expect((await request.get('/auth/verify')).status()).toBe(404);
    expect((await request.get('/portal/index.html')).status()).toBe(404);
  });

  test('the sign-in page is accessible and self-contained', async ({ page }) => {
    const origins = new Set<string>();
    page.on('request', (request) => origins.add(new URL(request.url()).origin));
    await page.goto('/login/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to the console');
    expect(origins.size).toBe(1);
    await expectAccessible(page);
  });

  test('answers wrong credentials with one generic message', async ({ page }) => {
    await page.goto('/login/');
    await enterPassword(page, readAdmin().username, 'definitely-not-the-password');
    await expect(page.getByRole('alert')).toHaveText('Incorrect username or password.');
    await expect(page.getByTestId('login-password-step')).toBeVisible();
  });

  test('locks out a client that keeps guessing', async ({ page }) => {
    await page.goto('/login/');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await enterPassword(page, 'intruder', `guess-number-${attempt}-xyz`);
      await expect(page.getByRole('alert')).toHaveText('Incorrect username or password.');
    }
    await enterPassword(page, 'intruder', 'one-more-guess-xyz');
    await expect(page.getByRole('alert')).toHaveText(/Too many attempts\. Try again in 15 minutes\./);
  });
});

test.describe('behind a Cloudflare tunnel', () => {
  test('keys the lockout on the visitor Cloudflare reports, not on the tunnel', async ({ request }) => {
    const guess = (ip: string) =>
      request.post('/auth/login', { data: { username: 'tunnel-visitor', password: 'wrong-guess-xyz-123' }, headers: { 'CF-Connecting-IP': ip } });
    for (let attempt = 0; attempt < 5; attempt += 1) expect((await guess('203.0.113.50')).status()).toBe(401);
    expect((await guess('203.0.113.50')).status()).toBe(429);
    // Another visitor through the same tunnel is not locked out with them.
    expect((await guess('198.51.100.7')).status()).toBe(401);
  });

  test('marks the session cookie Secure when the visitor arrived over HTTPS', async ({ request }) => {
    const admin = readAdmin();
    const https = { 'X-Forwarded-Proto': 'https', 'CF-Connecting-IP': '203.0.113.60' };
    const first = await request.post('/auth/login', { data: { username: admin.username, password: admin.password }, headers: https });
    const { challenge } = (await first.json()) as { challenge: string };
    const second = await request.post('/auth/login/verify', { data: { challenge, code: takeRecoveryCode() }, headers: https });
    expect(second.status()).toBe(200);
    expect(second.headers()['set-cookie']).toMatch(/^db_session=[\w-]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=\d+; Secure$/);
  });
});

test.describe('signing in', () => {
  test('asks for a second factor, sets a hardened cookie and returns to the requested page', async ({ page, context }) => {
    await page.goto('/docs/');
    await expect(page).toHaveURL(/\/login\/\?next=\/docs\/$/);
    const admin = readAdmin();
    await enterPassword(page, admin.username, admin.password);

    const second = page.getByTestId('login-second-factor-step');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Confirm it is you');
    await second.getByLabel('Authenticator code').fill('000000');
    await second.getByRole('button', { name: 'Verify and sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText(/code is not valid/);

    await second.getByLabel('Authenticator code').fill(await freshCode());
    await second.getByRole('button', { name: 'Verify and sign in' }).click();
    await expect(page).toHaveURL(/\/docs\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Documentation' })).toBeVisible();

    const session = (await context.cookies()).find((cookie) => cookie.name === 'db_session');
    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/' });
    expect(await page.evaluate(() => document.cookie)).not.toContain('db_session');
  });

  test('never follows an off-site "next"', async ({ page }) => {
    await signInWithRecoveryCode(page, '/login/?next=//evil.example/steal');
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Autonomous Container Diagnostics');
  });

  test('signing out ends the session', async ({ page }) => {
    await signInWithRecoveryCode(page);
    await page.getByTestId('session-menu').getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login\/$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\/\?next=\/$/);
  });
});

test.describe('account & security', () => {
  test.beforeEach(async ({ page }) => {
    await signInWithRecoveryCode(page, '/login/?next=/account/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account & security');
  });

  test('shows the account, its sessions and recent activity, accessibly', async ({ page }) => {
    await expect(page.getByTestId('panel-summary')).toContainText(readAdmin().username);
    await expect(page.getByTestId('panel-summary')).toContainText('Authenticator app · on');
    await expect(page.getByTestId('panel-sessions')).toContainText('this device');
    const activity = page.getByTestId('panel-activity');
    await expect(activity).toContainText('Setup completed');
    await expect(activity).toContainText('Recovery code used');
    await expect(activity).toContainText('Locked out');
    await expectAccessible(page);
  });

  test('signs out every other session', async ({ page }) => {
    const sessions = page.getByTestId('panel-sessions');
    await expect(sessions.getByRole('button', { name: 'Revoke' }).first()).toBeVisible();
    await sessions.getByRole('button', { name: 'Sign out other sessions' }).click();
    await expect(sessions.getByRole('listitem')).toHaveCount(1);
    await expect(sessions.getByRole('button', { name: 'Sign out other sessions' })).toBeDisabled();
  });

  test('regenerates recovery codes after a fresh authenticator code', async ({ page }) => {
    test.slow();
    const panel = page.getByTestId('panel-recovery');
    await panel.getByLabel('Authenticator code').fill(await freshCode());
    await panel.getByRole('button', { name: 'Generate new codes' }).click();
    const codes = panel.getByTestId('recovery-codes').getByRole('listitem');
    await expect(codes).toHaveCount(10);
    writeAdmin({ ...readAdmin(), recoveryCodes: await codes.allTextContents() });
    await expect(page.getByTestId('panel-summary')).toContainText('10 of 10 left');
  });

  test('changes the password, and the old one stops working', async ({ page, browser }) => {
    test.slow();
    const admin = readAdmin();
    const next = 'saffron-meadow-compass-77';
    const panel = page.getByTestId('panel-password');
    await panel.getByLabel('Current password').fill(admin.password);
    await panel.getByLabel('New password').fill(next);
    await panel.getByLabel('Authenticator code').fill(await freshCode());
    await panel.getByRole('button', { name: 'Change password' }).click();
    await expect(panel.getByRole('status')).toHaveText('Password changed.');
    writeAdmin({ ...readAdmin(), password: next });

    const visitor = await (await browser.newContext({ storageState: ANONYMOUS })).newPage();
    await visitor.goto('/login/');
    await enterPassword(visitor, admin.username, admin.password);
    await expect(visitor.getByRole('alert')).toHaveText('Incorrect username or password.');
    await enterPassword(visitor, admin.username, next);
    await expect(visitor.getByTestId('login-second-factor-step')).toBeVisible();
    await visitor.context().close();
  });
});
