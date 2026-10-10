import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, STORAGE_FILE } from './tests/e2e/support/state.ts';

// The suite builds and starts its own throwaway stack (see support/global-setup.ts),
// so it exercises the real containers: nginx, the auth service, headers and CSP.
//
//   setup    runs the onboarding wizard on the fresh install and keeps the session
//   desktop  ┐ the dashboard and docs, signed in, at two viewport sizes
//   mobile   ┘
//   account  sign-in, lockout and account changes; last, because it ends sessions
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };
const SIGNED_IN = /(dashboard|simulator|widgets|docs|security)\.spec\.ts/;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/support/global-setup.ts',
  globalTeardown: './tests/e2e/support/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    { name: 'setup', testMatch: /onboarding\.setup\.ts/, use: desktop },
    { name: 'desktop', testMatch: SIGNED_IN, dependencies: ['setup'], use: { ...desktop, storageState: STORAGE_FILE } },
    { name: 'mobile', testMatch: SIGNED_IN, dependencies: ['setup'], use: { ...devices['Pixel 7'], storageState: STORAGE_FILE } },
    { name: 'account', testMatch: /auth\.spec\.ts/, dependencies: ['desktop', 'mobile'], use: desktop },
  ],
});
