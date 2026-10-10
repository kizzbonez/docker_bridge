import { cannedOutput } from './exec-outputs';
import { evaluateCommand } from '@bridge/core/exec-policy';
import type { ContainerId } from './types';

export interface ExecArgs {
  container: ContainerId;
  command: string;
  timeout_ms: number;
}

export interface ExecResult {
  container: ContainerId;
  allowed: boolean;
  guardrail: string;
  exit_code: number | null;
  timed_out: boolean;
  duration_ms: number;
  stdout: string;
  stderr: string;
}

const SLEEP = /^sleep\s+(\d+(?:\.\d+)?)$/;

/** How long the command would run. Only `sleep` is slow in the simulation. */
function runtimeOf(command: string, fallbackMs: number): number {
  const seconds = SLEEP.exec(command)?.[1];
  return seconds === undefined ? fallbackMs : Number(seconds) * 1000;
}

/**
 * Mock of `docker_safe_exec`: policy check first, then a hard timeout. A blocked
 * command never reaches the container; an overrunning one is killed.
 */
export function safeExec(args: ExecArgs, readOnly: boolean): ExecResult {
  const command = args.command.trim();
  const verdict = evaluateCommand(command, readOnly);
  const base = { container: args.container, allowed: verdict.allowed, guardrail: verdict.guardrail };
  if (!verdict.allowed) {
    return { ...base, exit_code: null, timed_out: false, duration_ms: 0, stdout: '', stderr: `blocked: ${verdict.guardrail}` };
  }

  const output = cannedOutput(args.container, command);
  const runtime = runtimeOf(command, output.durationMs);
  if (runtime > args.timeout_ms) {
    return {
      ...base,
      exit_code: null,
      timed_out: true,
      duration_ms: args.timeout_ms,
      stdout: '',
      stderr: `sandbox: SIGKILL after ${args.timeout_ms} ms (timeout_ms)`,
    };
  }
  const stdout = SLEEP.test(command) ? '' : output.stdout;
  return { ...base, exit_code: 0, timed_out: false, duration_ms: runtime, stdout, stderr: '' };
}
