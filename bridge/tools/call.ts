import { validateArgs, type ArgValue } from '../core/validate-args.ts';
import { InvalidParams, ToolError } from '../errors.ts';
import type { Tool } from './registry.ts';

export type CallOutcome =
  /** The tool ran. `isError` marks a failure the caller should read, such as a refusal. */
  | { kind: 'result'; structured: Record<string, unknown>; isError: boolean }
  /** The request itself was wrong: unknown tool, or arguments that fail the schema. */
  | { kind: 'invalid'; message: string };

/** One finished call, as every transport and the activity log see it. */
export interface CallReport {
  tool: string;
  /** The validated arguments; null when validation failed. */
  args: Record<string, ArgValue> | null;
  outcome: CallOutcome;
  ms: number;
}

async function run(tool: Tool, args: Record<string, ArgValue>): Promise<CallOutcome> {
  try {
    const output = await tool.run(args);
    return { kind: 'result', structured: output.structured, isError: output.isError };
  } catch (error) {
    if (error instanceof InvalidParams) return { kind: 'invalid', message: error.message };
    // Expected failures go back as a result, so the caller can read why and adapt.
    if (error instanceof ToolError) return { kind: 'result', structured: { error: error.message }, isError: true };
    throw error;
  }
}

/**
 * Validates and runs one tool call. The MCP server and the web console both
 * go through here, so they accept and refuse exactly the same things.
 */
export async function callTool(tools: Tool[], name: string, rawArgs: unknown): Promise<CallReport> {
  const startedAt = Date.now();
  const report = (args: CallReport['args'], outcome: CallOutcome): CallReport => ({ tool: name, args, outcome, ms: Date.now() - startedAt });

  const tool = tools.find((candidate) => candidate.spec.name === name);
  if (!tool) return report(null, { kind: 'invalid', message: `unknown tool: ${name}` });
  const validated = validateArgs(tool.spec.inputSchema, rawArgs);
  if (!validated.ok) return report(null, { kind: 'invalid', message: validated.message });
  return report(validated.args, await run(tool, validated.args));
}
