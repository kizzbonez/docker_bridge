import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const path = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

/**
 * The public bundle: sign-in and onboarding only. It gets its own root and
 * output folder (dist/portal, served at /portal/) so nginx can expose exactly
 * this directory to anonymous visitors and keep every other file behind the
 * session check.
 */
export default defineConfig({
  root: path('./portal'),
  base: '/portal/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path('./src'), '@auth': path('./auth') },
  },
  build: {
    outDir: path('./dist/portal'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
});
