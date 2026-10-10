import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * jsdom has no matchMedia. Tests default to "prefers reduced motion", which
 * makes counters, typing and gauges resolve instantly and deterministically.
 * Call `setReducedMotion(false)` in a test that exercises the animated path.
 */
let reducedMotion = true;

export function setReducedMotion(value: boolean): void {
  reducedMotion = value;
}

// The auth service suite runs in a plain Node environment: no window to patch.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      get matches() {
        return reducedMotion;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // jsdom does not implement scrolling.
  Element.prototype.scrollIntoView = vi.fn();

  // No auth service behind component tests: session lookups simply fail,
  // which is also what happens under `npm run dev`. Tests that need a
  // session stub fetch themselves.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network disabled in unit tests'))));
}

afterEach(() => {
  cleanup();
  reducedMotion = true;
  vi.useRealTimers();
});
