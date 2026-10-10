import type { EngineAccess } from '../bridge/docker/containers.ts';
import { createEngine } from '../bridge/docker/engine.ts';
import type { CallReport } from '../bridge/tools/call.ts';
import { createTools, type Tool } from '../bridge/tools/registry.ts';
import { createActivityFeed, type ActivityFeed } from './activity-feed.ts';
import type { ConsoleConfig } from './config.ts';
import { createSelfLookup, type SelfLookup } from './self.ts';
import { createSessionCheck, type SessionCheck } from './session.ts';
import { createSharedReadings, type SharedReadings } from './shared-readings.ts';

/** Everything a request handler needs. Tests swap parts of it out. */
export interface ConsoleContext {
  config: ConsoleConfig;
  access: EngineAccess;
  tools: Tool[];
  session: SessionCheck;
  self: SelfLookup;
  activity: ActivityFeed;
  /** Topology readings, shared among the pages watching the same project. */
  readings: SharedReadings<CallReport>;
  /** The engine summary, shared among every open page: each one asks for it. */
  summaries: SharedReadings<Record<string, unknown>>;
  now: () => Date;
}

const MAX_ENGINE_BYTES = 4 * 1024 * 1024;
/** Half the page's refresh interval: every tab gets a reading no older than this. */
const READING_TTL_MS = 4_000;

const SUMMARY_TTL_MS = 3_000;

const succeeded = (report: CallReport): boolean => report.outcome.kind === 'result' && !report.outcome.isError;
const reachable = (summary: Record<string, unknown>): boolean => summary.reachable === true;

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
    readings: createSharedReadings(READING_TTL_MS, succeeded),
    summaries: createSharedReadings(SUMMARY_TTL_MS, reachable),
    now: () => new Date(),
    ...overrides,
  };
}
