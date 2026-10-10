import type { EngineAccess } from '../bridge/docker/containers.ts';
import { createEngine } from '../bridge/docker/engine.ts';
import { createTools, type Tool } from '../bridge/tools/registry.ts';
import { createActivityFeed, type ActivityFeed } from './activity-feed.ts';
import type { ConsoleConfig } from './config.ts';
import { createSelfLookup, type SelfLookup } from './self.ts';
import { createSessionCheck, type SessionCheck } from './session.ts';

/** Everything a request handler needs. Tests swap parts of it out. */
export interface ConsoleContext {
  config: ConsoleConfig;
  access: EngineAccess;
  tools: Tool[];
  session: SessionCheck;
  self: SelfLookup;
  activity: ActivityFeed;
  now: () => Date;
}

const MAX_ENGINE_BYTES = 4 * 1024 * 1024;

export function createContext(config: ConsoleConfig, audit: (line: string) => void, overrides: Partial<ConsoleContext> = {}): ConsoleContext {
  const engine = createEngine(config.bridge.socketPath, { timeoutMs: config.bridge.requestTimeoutMs, maxBytes: MAX_ENGINE_BYTES });
  const access: EngineAccess = { engine, config: config.bridge };
  return {
    config,
    access,
    tools: createTools(access),
    session: createSessionCheck(config.authUrl),
    self: createSelfLookup(engine, config.selfId),
    activity: createActivityFeed(config.activityDir, audit),
    now: () => new Date(),
    ...overrides,
  };
}
