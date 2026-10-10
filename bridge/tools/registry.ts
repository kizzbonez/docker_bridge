import { TOOL_SPECS, type ToolName, type ToolSpec } from '../core/tool-specs.ts';
import type { ArgValue } from '../core/validate-args.ts';
import type { EngineAccess } from '../docker/containers.ts';
import { safeExec, type ExecArgs } from './exec.ts';
import { tailLogs, type LogArgs } from './logs.ts';
import { stackTopology, type TopologyArgs } from './topology.ts';

export interface ToolOutput {
  structured: Record<string, unknown>;
  /** The call completed but its outcome is a failure the model should see. */
  isError: boolean;
}

export interface Tool {
  spec: ToolSpec;
  /** `args` have already been validated against the spec's schema. */
  run(args: Record<string, ArgValue>): Promise<ToolOutput>;
}

type Runner = (access: EngineAccess, args: Record<string, ArgValue>) => Promise<ToolOutput>;

const ok = (structured: Record<string, unknown>): ToolOutput => ({ structured, isError: false });

// The casts are sound: validateArgs has checked every field against the schema.
const RUNNERS: Record<ToolName, Runner> = {
  docker_get_stack_topology: async (access, args) => ok(await stackTopology(access, args as unknown as TopologyArgs)),
  docker_tail_filtered_logs: async (access, args) => ok(await tailLogs(access, args as unknown as LogArgs)),
  docker_safe_exec: async (access, args) => {
    const result = await safeExec(access, args as unknown as ExecArgs);
    return { structured: result, isError: result.allowed === false || result.timed_out === true };
  },
};

/** The three tools, bound to an engine and a configuration. */
export function createTools(access: EngineAccess): Tool[] {
  return (Object.keys(TOOL_SPECS) as ToolName[]).map((name) => ({
    spec: TOOL_SPECS[name],
    run: (args) => RUNNERS[name](access, args),
  }));
}
