import type { ActivityRecord, ActivityTotals } from '@bridge/core/activity-types';
import type { ToolName } from '@bridge/core/tool-specs';
import { jsonRequest } from '@/shared/lib/json-request';

/** Typed client for the live console's API. Same-origin and cookie-based, like the auth client. */

export interface BridgeInfo {
  version: string;
  readOnly: boolean;
  /** Compose projects the console is limited to, or null for everything. */
  scope: string[] | null;
  execEnabled: boolean;
  /** The compose project the console runs in, where it refuses to run commands. */
  selfProject: string | null;
}

export interface ProjectSummary {
  name: string;
  total: number;
  running: number;
}

export interface EngineUp {
  reachable: true;
  engine: { version: string; os: string; cpus: number; memoryMib: number };
  containers: { total: number; running: number };
  projects: ProjectSummary[];
  /** Containers that belong to no compose project. */
  standalone: number;
  bridge: BridgeInfo;
}

export interface EngineDown {
  reachable: false;
  error: string;
  bridge: BridgeInfo;
}

export type EngineSummary = EngineUp | EngineDown;

export interface TopologyService {
  name: string;
  image: string;
  health: string;
  restarts: number;
  last_exit?: { code: number; reason: string | null };
  cpu_percent?: number;
  memory_mib?: { used: number; limit: number | null };
}

export interface Topology {
  project: string;
  services: TopologyService[];
  edges: Array<{ from: string; to: string }>;
  unhealthy: string[];
}

export interface TailLine {
  line: number;
  repeats: number;
  text: string;
}

export interface TailResult {
  container: string;
  scanned_lines: number;
  matched_lines: number;
  returned_lines: number;
  truncated: boolean;
  tokens: { raw_tail: number; returned: number };
  lines: TailLine[];
}

export interface ExecResult {
  container: string;
  allowed: boolean;
  guardrail: string;
  exit_code: number | null;
  timed_out: boolean;
  duration_ms: number;
  stdout: string;
  stderr: string;
}

/** What a tool answers when it could not do its job, e.g. no such container. */
export interface ToolFailure {
  error: string;
}

export interface ToolReply<T> {
  structured: T | ToolFailure;
  isError: boolean;
  ms: number;
}

export interface ActivityView {
  calls: ActivityRecord[];
  totals: ActivityTotals;
  /** How many calls the totals cover. */
  window: number;
}

interface ErrorBody {
  error?: string;
  message?: string;
}

/** A non-2xx answer from the console service. */
export class ConsoleApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: ErrorBody) {
    super(body.message ?? body.error ?? 'request_failed');
    this.status = status;
    this.code = body.error ?? 'request_failed';
  }
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const reply = await jsonRequest(method, path, body);
  if (!reply.ok) throw new ConsoleApiError(reply.status, reply.data as ErrorBody);
  return reply.data as T;
}

export const isFailure = (structured: object): structured is ToolFailure => 'error' in structured;

export const consoleApi = {
  engine: () => request<EngineSummary>('GET', '/api/engine'),
  activity: () => request<ActivityView>('GET', '/api/activity'),
  call: <T>(name: ToolName, args: object) => request<ToolReply<T>>('POST', '/api/tools/call', { name, arguments: args }),
};
