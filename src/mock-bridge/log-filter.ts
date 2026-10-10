import { runLogPipeline, type TailOptions, type TailSummary } from '@bridge/core/log-pipeline';
import { RAW_LOGS } from './fixtures/raw-logs';
import type { ContainerId } from './types';

export interface TailArgs extends TailOptions {
  container: ContainerId;
}

export interface TailResult extends TailSummary {
  container: ContainerId;
}

export type TailOutcome = { ok: true; result: TailResult } | { ok: false; message: string };

/**
 * Simulated `docker_tail_filtered_logs`: the real pipeline from the MCP
 * server, fed with a fixture log instead of a container's.
 */
export function tailFilteredLogs(args: TailArgs): TailOutcome {
  const outcome = runLogPipeline(RAW_LOGS[args.container], args);
  if (!outcome.ok) return outcome;
  return { ok: true, result: { container: args.container, ...outcome.summary } };
}
