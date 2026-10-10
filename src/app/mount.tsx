import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/oxanium';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/jetbrains-mono';
import '../styles/index.css';

/** Shared bootstrap for every HTML entry: fonts, styles, strict mode. */
export function mount(page: ReactNode): void {
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root element');
  createRoot(root).render(<StrictMode>{page}</StrictMode>);
}
