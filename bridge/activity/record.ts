import { estimateTokens } from '../core/text.ts';
import { ACTIVITY_OUTCOMES, type ActivityOutcome, type ActivityRecord } from '../core/activity-types.ts';
import type { CallReport } from '../tools/call.ts';

export type { ActivityOutcome, ActivityRecord };

const MAX_CLIENT = 60;
const MAX_TARGET = 140;
const MAX_DETAIL = 160;

/** Printable, single-line and bounded: these strings end up in a file and on a web page. */
function tidy(value: unknown, limit: number): string {
  if (typeof value !== 'string') return '';
  const printable = [...value].filter((char) => char >= ' ' && char !== '\u007f').join('');
  return printable.trim().slice(0, limit);
}

export function clientLabel(clientInfo: unknown): string {
  if (typeof clientInfo !== 'object' || clientInfo === null) return 'unknown client';
  const { name, version } = clientInfo as { name?: unknown; version?: unknown };
  return tidy(`${tidy(name, MAX_CLIENT)} ${tidy(version, 20)}`, MAX_CLIENT) || 'unknown client';
}

function targetOf(args: CallReport['args']): string {
  if (!args) return '';
  const container = tidy(args.container, MAX_TARGET);
  const project = tidy(args.project, MAX_TARGET);
  return container && project ? `${project}/${container}` : container || project;
}

function outcomeOf(report: CallReport): ActivityOutcome {
  if (report.outcome.kind === 'invalid') return 'invalid';
  if (!report.outcome.isError) return 'ok';
  return report.outcome.structured.allowed === false ? 'refused' : 'error';
}

function tokensOf(report: CallReport): ActivityRecord['tokens'] {
  if (report.outcome.kind === 'invalid') return { raw: null, returned: 0 };
  const { structured } = report.outcome;
  const raw = (structured.tokens as { raw_tail?: unknown } | undefined)?.raw_tail;
  return { raw: typeof raw === 'number' ? raw : null, returned: estimateTokens(JSON.stringify(structured)) };
}

export function toRecord(report: CallReport, client: string, at: Date): ActivityRecord {
  return {
    at: at.toISOString(),
    client: tidy(client, MAX_CLIENT) || 'unknown client',
    tool: tidy(report.tool, 60),
    target: targetOf(report.args),
    detail: tidy(report.args?.command ?? report.args?.filter_pattern, MAX_DETAIL),
    outcome: outcomeOf(report),
    ms: report.ms,
    tokens: tokensOf(report),
  };
}

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0);

function parseJsonObject(line: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(line);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseTokens(value: unknown): ActivityRecord['tokens'] {
  const tokens = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return { raw: typeof tokens.raw === 'number' ? count(tokens.raw) : null, returned: count(tokens.returned) };
}

/**
 * Reads one line of the log back. The file sits on disk where anything could
 * have edited it, so every field is checked again and anything odd is dropped.
 */
export function parseRecord(line: string): ActivityRecord | null {
  const raw = parseJsonObject(line);
  if (!raw) return null;
  const at = typeof raw.at === 'string' ? Date.parse(raw.at) : NaN;
  const outcome = ACTIVITY_OUTCOMES.find((candidate) => candidate === raw.outcome);
  const tool = tidy(raw.tool, 60);
  if (Number.isNaN(at) || !outcome || tool === '') return null;
  return {
    at: new Date(at).toISOString(),
    client: tidy(raw.client, MAX_CLIENT) || 'unknown client',
    tool,
    target: tidy(raw.target, MAX_TARGET),
    detail: tidy(raw.detail, MAX_DETAIL),
    outcome,
    ms: count(raw.ms),
    tokens: parseTokens(raw.tokens),
  };
}
