import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, STORAGE_FILE } from './tests/e2e/support/state.ts';

// The suite builds and starts its own throwaway stack (see support/global-setup.ts),
// so it exercises the real containers: nginx, the auth service, headers and CSP.
//
//   setup    runs the onboarding wizard on the fresh install and keeps the session
//   desktop  ┐ the console, showcase and docs, signed in, and the public
//            │ showcase as a visitor, at two viewport sizes
//   mobile   ┘
//   image    what the web image itself does with its settings; no browser
//   account  sign-in, lockout and account changes; last, because it ends sessions
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
const BROWSER = /(console|showcase|public|simulator|widgets|docs|security)\.spec\.ts/;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/support/global-setup.ts',
  globalTeardown: './tests/e2e/support/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: true,
  // The console tests read a real Docker Engine while several browsers render
  // at once. Four workers keep the machine responsive enough for that, and one
  // retry absorbs a stall of the engine without hiding it: Playwright reports
  // such a test as flaky.
  workers: 4,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'setup', testMatch: /onboarding\.setup\.ts/, use: desktop },
    { name: 'desktop', testMatch: BROWSER, dependencies: ['setup'], use: { ...desktop, storageState: STORAGE_FILE } },
    { name: 'mobile', testMatch: BROWSER, dependencies: ['setup'], use: { ...devices['Pixel 7'], storageState: STORAGE_FILE } },
    { name: 'image', testMatch: /site-policy\.spec\.ts/, dependencies: ['setup'] },
    { name: 'account', testMatch: /auth\.spec\.ts/, dependencies: ['desktop', 'mobile'], use: desktop },
  ],
});
