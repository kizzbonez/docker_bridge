import { splitArgv } from '../core/argv.ts';
import { deadlineMessage, evaluateCommand } from '../core/exec-policy.ts';
import { REDACTED, isSecretName, redactEnvLines, redactSecrets } from '../core/redact.ts';
import { clip } from '../core/text.ts';
import { findContainer, type EngineAccess } from '../docker/containers.ts';
import { callJson, messageOf, type Engine } from '../docker/engine.ts';
import { demux } from '../docker/stream.ts';
import { ToolError } from '../errors.ts';

export interface ExecArgs {
  container: string;
  project?: string;
  command: string;
  timeout_ms: number;
}

const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_OUTPUT_CHARS = 6_000;
const NOT_STARTED = 127;

interface Run {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

/**
 * Extra environment for the exec. psql gets a server-side statement timeout,
 * so the database itself cancels a query that outlives the deadline.
 */
function environmentFor(argv: string[], timeoutMs: number): string[] {
  return argv[0] === 'psql' ? [`PGOPTIONS=-c statement_timeout=${timeoutMs}`] : [];
}

/**
 * Runs argv in the container and waits at most `timeoutMs`.
 *
 * Nothing is added around the command: no shell, and no `timeout` wrapper,
 * because on BusyBox images that leaves a defunct process behind after every
 * call. When the deadline passes we close the stream. A process that is
 * writing output dies on the closed pipe; a silent one runs to its end, which
 * the policy keeps short.
 */
async function run(engine: Engine, id: string, argv: string[], timeoutMs: number): Promise<Run> {
  const created = await callJson<{ Id: string }>(engine, 'POST', `/containers/${id}/exec`, {
    body: { AttachStdin: false, AttachStdout: true, AttachStderr: true, Tty: false, Cmd: argv, Env: environmentFor(argv, timeoutMs) },
  });
  const startedAt = Date.now();
  const response = await engine.send('POST', `/exec/${created.Id}/start`, {
    body: { Detach: false, Tty: false },
    timeoutMs,
    maxBytes: MAX_OUTPUT_BYTES,
  });
  const durationMs = Date.now() - startedAt;
  if (response.status >= 400) return { stdout: '', stderr: messageOf(response), exitCode: NOT_STARTED, timedOut: false, durationMs };

  const { stdout, stderr } = demux(response.body);
  if (response.timedOut) return { stdout, stderr, exitCode: null, timedOut: true, durationMs };
  const state = await callJson<{ ExitCode?: number | null }>(engine, 'GET', `/exec/${created.Id}/json`).catch(() => null);
  return { stdout, stderr, exitCode: state?.ExitCode ?? null, timedOut: false, durationMs };
}

/** Redacts, then clips. `env` output is redacted by variable name as well. */
function present(output: string, argv: string[]): string {
  if (output === '') return '';
  const [binary, variable] = argv;
  if (binary === 'printenv' && variable !== undefined && isSecretName(variable)) return REDACTED;
  const byName = binary === 'env' || binary === 'printenv' ? redactEnvLines(output) : output;
  return clip(redactSecrets(byName).trimEnd(), MAX_OUTPUT_CHARS);
}

const refusal = (container: string, guardrail: string): Record<string, unknown> => ({
  container,
  allowed: false,
  guardrail,
  exit_code: null,
  timed_out: false,
  duration_ms: 0,
  stdout: '',
  stderr: `blocked: ${guardrail}`,
});

/** `docker_safe_exec` against a live engine: policy first, then a deadline. */
export async function safeExec(access: EngineAccess, args: ExecArgs): Promise<Record<string, unknown>> {
  const command = args.command.trim();
  const verdict = evaluateCommand(command, access.config.readOnly);
  if (!verdict.allowed) return refusal(args.container, verdict.guardrail);
  const argv = splitArgv(command);
  if (!argv || argv.length === 0) return refusal(args.container, 'command has an unterminated quote');

  const container = await findContainer(access, args.container, args.project);
  if (container.state !== 'running') throw new ToolError(`container "${container.name}" is not running (state: ${container.state})`);

  const outcome = await run(access.engine, container.id, argv, args.timeout_ms);
  const stderr = present(outcome.stderr, argv);
  return {
    container: container.name,
    allowed: true,
    guardrail: verdict.guardrail,
    exit_code: outcome.exitCode,
    timed_out: outcome.timedOut,
    duration_ms: outcome.durationMs,
    stdout: present(outcome.stdout, argv),
    stderr: outcome.timedOut ? [stderr, deadlineMessage(args.timeout_ms)].filter(Boolean).join('\n') : stderr,
  };
}
