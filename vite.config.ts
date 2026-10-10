import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The password policy is shared verbatim between the browser and the auth service.
      '@auth': fileURLToPath(new URL('./auth', import.meta.url)),
      // The tool contract is shared verbatim between the dashboard and the MCP server.
      '@bridge': fileURLToPath(new URL('./bridge', import.meta.url)),
    },
  },
  server: {
    // Optional in development: `node auth/server.ts` on 8081 enables sign-in.
    proxy: { '/auth': 'http://127.0.0.1:8081' },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Never inline assets as data: URIs, so the CSP can stay at 'self' only.
    assetsInlineLimit: 0,
    // Protected pages: dashboard at /, docs at /docs/, account at /account/.
    // The public sign-in portal is a separate build: see vite.portal.config.ts.
    rolldownOptions: {
      input: {
        dashboard: fileURLToPath(new URL('./index.html', import.meta.url)),
        docs: fileURLToPath(new URL('./docs/index.html', import.meta.url)),
        account: fileURLToPath(new URL('./account/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'auth/**/*.test.ts', 'bridge/**/*.test.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'auth/**/*.ts', 'bridge/**/*.ts'],
      exclude: ['src/test/**', '**/*.test.{ts,tsx}', 'src/*main.tsx', 'auth/test-harness.ts', 'auth/server.ts', 'auth/cli.ts', 'bridge/test-support/**', 'bridge/index.ts'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
