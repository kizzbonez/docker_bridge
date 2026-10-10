import { callJson, type Engine } from '../bridge/docker/engine.ts';

const PROJECT_LABEL = 'com.docker.compose.project';

/**
 * The compose project the console itself runs in.
 *   none     not in a container, or not started by compose: nothing to protect
 *   known    this project holds the sign-in secrets
 *   unknown  in a container, but the engine could not say which project
 */
export type SelfStack = { status: 'none' } | { status: 'known'; project: string } | { status: 'unknown' };

export type SelfLookup = () => Promise<SelfStack>;

interface Inspect {
  Config?: { Labels?: Record<string, string> | null };
}

/** Looks the answer up once it can, and remembers it. A failed lookup is retried next time. */
export function createSelfLookup(engine: Engine, selfId: string | null): SelfLookup {
  let settled: SelfStack | null = selfId === null ? { status: 'none' } : null;
  return async () => {
    if (settled) return settled;
    try {
      const info = await callJson<Inspect>(engine, 'GET', `/containers/${selfId}/json`);
      const project = info.Config?.Labels?.[PROJECT_LABEL];
      settled = project ? { status: 'known', project } : { status: 'none' };
      return settled;
    } catch {
      return { status: 'unknown' };
    }
  };
}
