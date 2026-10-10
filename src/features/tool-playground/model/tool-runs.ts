import { BASELINE_MESH, PROJECT } from '@/mock-bridge/fleet';
import { tailFilteredLogs, type TailArgs } from '@/mock-bridge/log-filter';
import { INVALID_PARAMS, rpcCall, rpcError, rpcResult } from '@/mock-bridge/rpc';
import { safeExec, type ExecArgs } from '@/mock-bridge/safe-exec';
import { getStackTopology, type TopologyArgs } from '@/mock-bridge/topology';
import type { Tone } from '@/shared/lib/tone';

/** One request/response pair as shown in the playground. */
export interface ToolRun {
  request: string;
  response: string;
  status: { label: string; tone: Tone };
}

const OK = { label: 'ok', tone: 'ok' } as const;
const REQUEST_ID = 1;

export const TOPOLOGY_DEFAULTS: TopologyArgs = { project: PROJECT, include_metrics: true, include_stopped: true };

export const TAIL_DEFAULTS: TailArgs = {
  container: 'web-gateway',
  filter_pattern: 'error|502',
  tail_lines: 120,
  strip_ansi: true,
  token_budget: 320,
};

export const EXEC_DEFAULTS: ExecArgs = {
  container: 'db-postgres',
  command: 'pg_isready -h localhost -p 5432',
  timeout_ms: 2000,
};

export function runTopology(args: TopologyArgs): ToolRun {
  return {
    request: rpcCall(REQUEST_ID, 'docker_get_stack_topology', args),
    response: rpcResult(REQUEST_ID, getStackTopology(BASELINE_MESH, args)),
    status: OK,
  };
}

export function runTail(args: TailArgs): ToolRun {
  const outcome = tailFilteredLogs(args);
  const request = rpcCall(REQUEST_ID, 'docker_tail_filtered_logs', args);
  if (!outcome.ok) {
    const response = rpcError(REQUEST_ID, INVALID_PARAMS, outcome.message);
    return { request, response, status: { label: 'invalid params', tone: 'crit' } };
  }
  const status = outcome.result.truncated ? ({ label: 'truncated at budget', tone: 'warn' } as const) : OK;
  return { request, response: rpcResult(REQUEST_ID, outcome.result), status };
}

function execStatus(allowed: boolean, timedOut: boolean): ToolRun['status'] {
  if (!allowed) return { label: 'blocked', tone: 'crit' };
  return timedOut ? { label: 'timed out', tone: 'warn' } : OK;
}

export function runExec(args: ExecArgs, readOnly: boolean): ToolRun {
  const result = safeExec(args, readOnly);
  return {
    request: rpcCall(REQUEST_ID, 'docker_safe_exec', args),
    response: rpcResult(REQUEST_ID, result, !result.allowed || result.timed_out),
    status: execStatus(result.allowed, result.timed_out),
  };
}
