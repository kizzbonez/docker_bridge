import { rmSync } from 'node:fs';
import { startStack } from '../../../scripts/stack.mjs';
import { E2E_PORT, E2E_PROJECT, STATE_DIR, writeStack } from './state.ts';

/**
 * Boots a throwaway stack with an empty volume, so the suite begins exactly
 * where a new install does: at the onboarding wizard.
 */
export default function globalSetup(): void {
  rmSync(STATE_DIR, { recursive: true, force: true });
  writeStack(startStack({ project: E2E_PROJECT, port: E2E_PORT }));
}
