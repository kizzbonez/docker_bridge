import { rmSync } from 'node:fs';
import { writeSampleActivity } from '../../../scripts/sample-activity.mjs';
import { startStack } from '../../../scripts/stack.mjs';
import { E2E_PORT, E2E_PROJECT, STATE_DIR, writeStack } from './state.ts';

/**
 * Boots a throwaway stack with an empty volume, so the suite begins exactly
 * where a new install does: at the onboarding wizard. Its console reads a
 * sample activity log and sees only the throwaway stack itself.
 */
export default function globalSetup(): void {
  rmSync(STATE_DIR, { recursive: true, force: true });
  const activityDir = writeSampleActivity(`${STATE_DIR}activity`);
  writeStack(startStack({ project: E2E_PROJECT, port: E2E_PORT, activityDir }));
}
