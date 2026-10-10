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
    // Optional in development: `node auth/server.ts` on 8081 enables sign-in,
    // and `npm run console` on 8082 feeds the live console.
    proxy: { '/auth': 'http://127.0.0.1:8081', '/api': 'http://127.0.0.1:8082' },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Never inline assets as data: URIs, so the CSP can stay at 'self' only.
    assetsInlineLimit: 0,
    // Protected pages: the console at /, docs at /docs/ and the account page at
    // /account/. The sign-in portal and the showcase are separate builds, so
    // each can be served without a session: see vite.portal.config.ts and
    // vite.showcase.config.ts.
    rolldownOptions: {
      input: {
        console: fileURLToPath(new URL('./index.html', import.meta.url)),
        docs: fileURLToPath(new URL('./docs/index.html', import.meta.url)),
        account: fileURLToPath(new URL('./account/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'auth/**/*.test.ts', 'bridge/**/*.test.ts', 'console/**/*.test.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'auth/**/*.ts', 'bridge/**/*.ts', 'console/**/*.ts'],
      exclude: ['src/test/**', '**/*.test.{ts,tsx}', 'src/*main.tsx', 'auth/test-harness.ts', 'auth/server.ts', 'auth/cli.ts', 'bridge/test-support/**', 'bridge/index.ts', 'console/server.ts', 'console/test-harness.ts'],
      reporter: ['text-summary', 'json-summary'],
    },
  },
});
