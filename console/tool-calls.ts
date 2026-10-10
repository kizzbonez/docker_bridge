import { HttpError } from '../auth/http.ts';
import { toRecord } from '../bridge/activity/record.ts';
import type { ArgValue } from '../bridge/core/validate-args.ts';
import { findContainer } from '../bridge/docker/containers.ts';
import { InvalidParams, ToolError } from '../bridge/errors.ts';
import { callTool, type CallReport } from '../bridge/tools/call.ts';
import type { ConsoleContext } from './context.ts';

const CLIENT = 'web console';
const EXEC = 'docker_safe_exec';

const OWN_STACK = 'the console does not run commands in its own stack, which holds the sign-in secrets';
const UNSURE = 'the console could not establish which stack it runs in, so it will not run commands';
const SWITCHED_OFF = 'running commands from the web console is switched off (CONSOLE_EXEC)';

/** The same shape `docker_safe_exec` answers with when its own policy refuses. */
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

/** Does the target sit in the console's own compose project? */
async function targetsOwnStack(ctx: ConsoleContext, args: Record<string, unknown>): Promise<string | null> {
  const self = await ctx.self();
  if (self.status === 'none') return null;
  if (self.status === 'unknown') return UNSURE;
  if (typeof args.container !== 'string') return null;
  try {
    const project = typeof args.project === 'string' ? args.project : undefined;
    const container = await findContainer(ctx.access, args.container, project);
    return container.project === self.project ? OWN_STACK : null;
  } catch (error) {
    // No such container, or a bad name: the tool reports that itself.
    if (error instanceof ToolError || error instanceof InvalidParams) return null;
    throw error;
  }
}

/** Rules the browser gets on top of the bridge's own policy. */
async function consoleRefusal(ctx: ConsoleContext, name: string, args: Record<string, unknown>): Promise<string | null> {
  if (name !== EXEC) return null;
  if (!ctx.config.execEnabled) return SWITCHED_OFF;
  return targetsOwnStack(ctx, args);
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

async function run(ctx: ConsoleContext, name: string, args: Record<string, unknown>): Promise<CallReport> {
  const startedAt = Date.now();
  const refused = await consoleRefusal(ctx, name, args);
  if (refused === null) return callTool(ctx.tools, name, args);
  const kept: Record<string, ArgValue> = {};
  for (const key of ['container', 'project', 'command']) if (typeof args[key] === 'string') kept[key] = args[key];
  const structured = refusal(String(args.container ?? ''), refused);
  return { tool: name, args: kept, outcome: { kind: 'result', structured, isError: true }, ms: Date.now() - startedAt };
}

/**
 * `POST /api/tools/call`: one tool call from the browser, through the same
 * validation and policy an agent's call goes through, and put on record.
 */
export async function toolsCall(ctx: ConsoleContext, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (typeof body.name !== 'string' || body.name.length > 80) throw new HttpError(400, 'invalid_request', { field: 'name' });
  const report = await run(ctx, body.name, asObject(body.arguments));
  ctx.activity.note(toRecord(report, CLIENT, ctx.now()));
  if (report.outcome.kind === 'invalid') throw new HttpError(400, 'invalid_params', { message: report.outcome.message });
  return { structured: report.outcome.structured, isError: report.outcome.isError, ms: report.ms };
}
