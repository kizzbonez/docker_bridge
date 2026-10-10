import { PROJECT } from '@/mock-bridge/fleet';
import { tailFilteredLogs, type TailArgs } from '@/mock-bridge/log-filter';
import { INVALID_PARAMS, rpcCall, rpcError, rpcResult } from '@/mock-bridge/rpc';
import { safeExec, type ExecArgs } from '@/mock-bridge/safe-exec';
import type { ToolName } from '@bridge/core/tool-specs';
import { getStackTopology } from '@/mock-bridge/topology';
import type { MeshPatch, MeshState } from '@/mock-bridge/types';
import { estimateTokens } from '@/shared/lib/tokens';
import type { Step } from './types';

export const prompt = (text: string): Step => ({ kind: 'prompt', text });
export const thought = (text: string, mesh?: MeshPatch): Step => ({ kind: 'thought', text, mesh });
export const diff = (file: string, text: string): Step => ({ kind: 'diff', label: file, text });
export const verdict = (text: string): Step => ({ kind: 'verdict', text });

const call = (id: number, tool: ToolName, args: object): Step => ({
  kind: 'call',
  label: tool,
  text: rpcCall(id, tool, args),
});

// Each exchange runs the real mock tool, so the terminal, the playground and
// the token widget can never drift apart.

export function topologyExchange(id: number, mesh: MeshState): Step[] {
  const args = { project: PROJECT, include_metrics: true, include_stopped: true };
  return [
    call(id, 'docker_get_stack_topology', args),
    { kind: 'result', text: rpcResult(id, getStackTopology(mesh, args)) },
  ];
}

export function logsExchange(id: number, args: TailArgs): Step[] {
  const outcome = tailFilteredLogs(args);
  const text = outcome.ok ? rpcResult(id, outcome.result) : rpcError(id, INVALID_PARAMS, outcome.message);
  return [call(id, 'docker_tail_filtered_logs', args), { kind: 'result', text }];
}

export function execExchange(id: number, args: ExecArgs): Step[] {
  const result = safeExec(args, false);
  return [call(id, 'docker_safe_exec', args), { kind: 'result', text: rpcResult(id, result, !result.allowed) }];
}

/** "3 tool calls · ≈ 412 tokens of tool output" for the closing verdict. */
export function toolUsage(steps: Step[]): string {
  const results = steps.filter((step) => step.kind === 'result');
  const tokens = results.reduce((sum, step) => sum + estimateTokens(step.text), 0);
  return `${results.length} tool calls · ≈ ${tokens} tokens of tool output`;
}
