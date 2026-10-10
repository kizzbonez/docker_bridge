import { stopStack } from '../../../scripts/stack.mjs';
import { E2E_PROJECT } from './state.ts';

/** Removes the throwaway stack and its volume. Set E2E_KEEP_STACK=1 to inspect it instead. */
export default function globalTeardown(): void {
  if (process.env.E2E_KEEP_STACK !== '1') stopStack(E2E_PROJECT);
}
