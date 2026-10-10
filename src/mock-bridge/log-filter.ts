import { stripAnsi } from '@/shared/lib/ansi';
import { estimateTokens } from '@/shared/lib/tokens';
import { MAX_LINE_LENGTH, compilePattern } from './filter-pattern';
import { RAW_LOGS } from './fixtures/raw-logs';
import type { ContainerId } from './types';

export interface TailArgs {
  container: ContainerId;
  filter_pattern: string;
  tail_lines: number;
  strip_ansi: boolean;
  token_budget: number;
}

export interface TailLine {
  line: number;
  repeats: number;
  text: string;
}

export interface TailResult {
  container: ContainerId;
  scanned_lines: number;
  matched_lines: number;
  returned_lines: number;
  ansi_stripped: boolean;
  truncated: boolean;
  tokens: { raw_tail: number; returned: number };
  lines: TailLine[];
}

export type TailOutcome = { ok: true; result: TailResult } | { ok: false; message: string };

// Lines that differ only in numbers (timestamps, pids, request ids) are one event.
const eventKey = (text: string): string => stripAnsi(text).replace(/\d+/g, '#');

function collapse(lines: TailLine[]): TailLine[] {
  const byKey = new Map<string, TailLine>();
  for (const line of lines) {
    const key = eventKey(line.text);
    const seen = byKey.get(key);
    if (seen) seen.repeats += 1;
    else byKey.set(key, { ...line });
  }
  return [...byKey.values()];
}

function fitBudget(lines: TailLine[], budget: number): { kept: TailLine[]; used: number } {
  const kept: TailLine[] = [];
  let used = 0;
  for (const line of lines) {
    const cost = estimateTokens(line.text);
    if (used + cost > budget) break;
    kept.push(line);
    used += cost;
  }
  return { kept, used };
}

/** Mock of `docker_tail_filtered_logs`: tail → sanitize → match → dedupe → budget. */
export function tailFilteredLogs(args: TailArgs): TailOutcome {
  const pattern = compilePattern(args.filter_pattern);
  if (!pattern.ok) return { ok: false, message: pattern.message };

  const all = RAW_LOGS[args.container];
  const tail = all.slice(-Math.max(1, args.tail_lines));
  const firstLine = all.length - tail.length + 1;
  const matched = tail
    .map((raw, index) => ({ line: firstLine + index, repeats: 1, text: args.strip_ansi ? stripAnsi(raw) : raw }))
    .filter((entry) => pattern.regex.test(entry.text.slice(0, MAX_LINE_LENGTH)));
  const collapsed = collapse(matched);
  const { kept, used } = fitBudget(collapsed, args.token_budget);

  return {
    ok: true,
    result: {
      container: args.container,
      scanned_lines: tail.length,
      matched_lines: matched.length,
      returned_lines: kept.length,
      ansi_stripped: args.strip_ansi,
      truncated: kept.length < collapsed.length,
      tokens: { raw_tail: estimateTokens(tail.join('\n')), returned: used },
      lines: kept,
    },
  };
}
