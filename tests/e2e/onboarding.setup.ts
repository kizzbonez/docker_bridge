import { counterAt, totpAt } from '../../auth/totp.ts';
import { expect, test } from './fixtures';
import { STORAGE_FILE, readStack, writeAdmin } from './support/state.ts';

const USERNAME = 'operator';
const PASSWORD = 'violet-harbor-lantern-42';

// One fresh install, walked through in order.
test.describe.configure({ mode: 'serial' });

test.describe('first-run onboarding', () => {
  test('a fresh install sends every visitor to setup', async ({ page }) => {
    await page.goto('/docs/');
    await expect(page).toHaveURL(/\/setup\/\?next=\/docs\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome. Let’s secure this install');
    await expect(page.getByRole('list', { name: 'Setup progress' }).getByRole('listitem')).toHaveCount(4);
    await expect(page.getByText('docker compose logs auth')).toBeVisible();
  });

  test('refuses a wrong setup token', async ({ page }) => {
    await page.goto('/setup/');
    await page.getByLabel('Setup token').fill('WRONG-WRONG-WRONG-WRONG');
    await page.getByRole('button', { name: 'Verify token' }).click();
    await expect(page.getByRole('alert')).toHaveText(/setup token is not correct/);
    await expect(page.getByTestId('setup-token-step')).toBeVisible();
  });

  test('creates the administrator, enrolls an authenticator and issues recovery codes', async ({ page }) => {
    const { setupToken } = readStack();
    await page.goto('/setup/');

    // 1. Token from the server logs.
    await page.getByLabel('Setup token').fill(setupToken.toLowerCase());
    await page.getByRole('button', { name: 'Verify token' }).click();

    // 2. Account: the policy gates the button, live.
    const account = page.getByTestId('setup-account-step');
    await account.getByLabel('Username').fill(USERNAME);
    await account.getByLabel('Password', { exact: true }).fill('password1234');
    await expect(page.getByTestId('policy-meter')).toContainText('○ Not a commonly used password');
    await expect(account.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await account.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await expect(page.getByTestId('policy-meter')).toContainText('✓ At least 12 characters');
    await account.getByLabel('Confirm password').fill(`${PASSWORD}-typo`);
    await expect(page.getByRole('alert')).toHaveText('The two passwords do not match.');
    await account.getByLabel('Confirm password').fill(PASSWORD);
    await account.getByRole('button', { name: 'Continue' }).click();

    // 3. Authenticator: a wrong code is refused, the real one is accepted.
    const enroll = page.getByTestId('setup-authenticator-step');
    await expect(enroll.getByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible();
    const totpSecret = ((await page.getByTestId('totp-secret').textContent()) ?? '').replaceAll(' ', '');
    expect(totpSecret).toMatch(/^[A-Z2-7]{32}$/);
    await enroll.getByLabel('Code from the app').fill('000000');
    await enroll.getByRole('button', { name: 'Verify and create account' }).click();
    await expect(page.getByRole('alert')).toHaveText(/code is not valid/);

    const now = Date.now();
    await enroll.getByLabel('Code from the app').fill(totpAt(totpSecret, now));
    await enroll.getByRole('button', { name: 'Verify and create account' }).click();

    // 4. Recovery codes: shown once, and acknowledged before continuing.
    const codes = page.getByTestId('recovery-codes').getByRole('listitem');
    await expect(codes).toHaveCount(10);
    const recoveryCodes = await codes.allTextContents();
    const open = page.getByRole('button', { name: 'Open the dashboard' });
    await expect(open).toBeDisabled();
    await page.getByLabel('I have stored my recovery codes').check();
    await open.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Autonomous Container Diagnostics');
    await expect(page.getByTestId('session-menu')).toContainText(USERNAME);

    await page.context().storageState({ path: STORAGE_FILE });
    writeAdmin({ username: USERNAME, password: PASSWORD, totpSecret, recoveryCodes, lastCounter: counterAt(now) });
  });

  test('closes setup for good once the account exists', async ({ page, request }) => {
    const { setupToken } = readStack();
    const replay = await request.post('/auth/setup/token', { data: { token: setupToken } });
    expect(replay.status()).toBe(409);
    expect(await replay.json()).toEqual({ error: 'already_configured' });

    await page.goto('/setup/');
    await expect(page).toHaveURL(/\/login\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to the console');
  });
});
