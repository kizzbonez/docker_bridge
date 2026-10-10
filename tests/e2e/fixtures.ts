import { test as base, expect, type Page } from '@playwright/test';

interface Fixtures {
  /** Console errors, uncaught exceptions, failed requests and 4xx/5xx responses. */
  problems: string[];
}

// The auth API answers bad credentials with 4xx by design; those are asserted
// on explicitly by the tests that provoke them.
const isAuthApi = (url: string): boolean => new URL(url).pathname.startsWith('/auth/');

/**
 * Every test fails if the page logs an error. Chromium reports CSP violations
 * as console errors, so this also proves the policy blocks nothing we ship.
 */
export const test = base.extend<Fixtures>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && !isAuthApi(message.location().url || 'http://x/')) {
          problems.push(`console: ${message.text()}`);
        }
      });
      page.on('pageerror', (error) => problems.push(`exception: ${error.message}`));
      page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));
      page.on('response', (response) => {
        if (response.status() >= 400 && !isAuthApi(response.url())) problems.push(`${response.status()}: ${response.url()}`);
      });
      await use(problems);
      expect(problems, 'the page should load and run without errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const card = (page: Page, id: string) => page.getByTestId(`container-${id}`);
export const terminal = (page: Page) => page.getByTestId('terminal-output');
