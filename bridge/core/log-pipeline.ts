import { MAX_LINE_LENGTH, compilePattern } from './filter-pattern.ts';
import { redactSecrets } from './redact.ts';
import { clip, estimateTokens, stripAnsi } from './text.ts';

export interface TailOptions {
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

export interface TailSummary {
  scanned_lines: number;
  matched_lines: number;
  returned_lines: number;
  ansi_stripped: boolean;
  truncated: boolean;
  tokens: { raw_tail: number; returned: number };
  lines: TailLine[];
}

export type PipelineOutcome = { ok: true; summary: TailSummary } | { ok: false; message: string };

/** One returned line never exceeds this, however long the original was. */
export const MAX_RETURNED_LINE_LENGTH = 600;

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

/** Sanitised, clipped and redacted: the form in which a line may leave the server. */
function present(raw: string, stripColour: boolean): string {
  const text = stripColour ? stripAnsi(raw) : raw;
  return clip(redactSecrets(text), MAX_RETURNED_LINE_LENGTH);
}

/**
 * The log pipeline: tail, sanitise, match, dedupe, budget. `lines` is the
 * log in order; `firstLineNumber` is the number of the first scanned line when
 * the caller knows where the tail sits in the whole log.
 */
export function runLogPipeline(lines: string[], options: TailOptions, firstLineNumber?: number): PipelineOutcome {
  const pattern = compilePattern(options.filter_pattern);
  if (!pattern.ok) return { ok: false, message: pattern.message };

  const tail = lines.slice(-Math.max(1, options.tail_lines));
  const offset = firstLineNumber ?? lines.length - tail.length + 1;
  const matched = tail
    .map((raw, index) => ({ line: offset + index, repeats: 1, text: present(raw, options.strip_ansi) }))
    .filter((entry) => pattern.regex.test(entry.text.slice(0, MAX_LINE_LENGTH)));
  const collapsed = collapse(matched);
  const { kept, used } = fitBudget(collapsed, options.token_budget);

  return {
    ok: true,
    summary: {
      scanned_lines: tail.length,
      matched_lines: matched.length,
      returned_lines: kept.length,
      ansi_stripped: options.strip_ansi,
      truncated: kept.length < collapsed.length,
      tokens: { raw_tail: estimateTokens(tail.join('\n')), returned: used },
      lines: kept,
    },
  };
}
