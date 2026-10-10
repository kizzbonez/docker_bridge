import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const path = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

/**
 * The showcase bundle: the simulated walkthrough, and nothing else. Like the
 * sign-in portal it gets its own root and output folder (dist/showcase, served
 * at /showcase/), so nginx can serve exactly this directory to visitors when
 * the showcase is made public, and keep every other file behind the session.
 *
 * It points at the shared public folder so that logo and favicon URLs are
 * recognised, but copies nothing from it: nginx serves /showcase/brand/ from
 * the one brand folder the site already has.
 */
export default defineConfig({
  root: path('./showcase'),
  base: '/showcase/',
  publicDir: path('./public'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path('./src'), '@auth': path('./auth'), '@bridge': path('./bridge') },
  },
  build: {
    outDir: path('./dist/showcase'),
    emptyOutDir: true,
    copyPublicDir: false,
    target: 'es2022',
    sourcemap: false,
    assetsInlineLimit: 0,
  },
});
