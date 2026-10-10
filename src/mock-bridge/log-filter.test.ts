import { describe, expect, it } from 'vitest';
import { ESC } from '@/shared/lib/ansi';
import { MAX_LINE_LENGTH, MAX_PATTERN_LENGTH, compilePattern } from './filter-pattern';
import { RAW_LOGS } from './fixtures/raw-logs';
import { tailFilteredLogs, type TailArgs } from './log-filter';
import { CONTAINER_IDS } from './types';

const base: TailArgs = {
  container: 'web-gateway',
  filter_pattern: 'connect\\(\\) failed',
  tail_lines: 120,
  strip_ansi: true,
  token_budget: 320,
};

function run(overrides: Partial<TailArgs> = {}) {
  const outcome = tailFilteredLogs({ ...base, ...overrides });
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome.result;
}

describe('compilePattern', () => {
  it('accepts an ordinary pattern, case-insensitively', () => {
    const compiled = compilePattern('fatal|error');
    expect(compiled.ok && compiled.regex.test('FATAL: boom')).toBe(true);
  });

  it('rejects invalid syntax', () => {
    expect(compilePattern('([')).toMatchObject({ ok: false });
  });

  it('rejects over-long patterns', () => {
    expect(compilePattern('a'.repeat(MAX_PATTERN_LENGTH + 1))).toMatchObject({ ok: false });
  });

  it.each(['(a+)+$', '(.*)*', '(x+){2,}', '(a|aa)+$', '(.|.)*x', '(\\d|\\w)*!', '.*.*.*x', 'a*a*a*b', 'a+b+c+d'])(
    'rejects the catastrophic shape %s',
    (pattern) => {
      const compiled = compilePattern(pattern);
      expect(compiled.ok).toBe(false);
      expect(!compiled.ok && compiled.message).toContain('ReDoS');
    },
  );

  // Escaped quantifier characters are literals and must not count against the cap.
  it.each(['error|fatal', '(GET|POST) /api', 'connect\\(\\) failed', 'timeout.*pool', '\\d{3} \\d+', 'a\\+b\\*c\\+d\\*e', '^\\[error\\]'])(
    'still accepts the ordinary filter %s',
    (pattern) => {
      expect(compilePattern(pattern).ok).toBe(true);
    },
  );

  it('keeps every accepted pattern fast on the most hostile line it can be given', () => {
    const hostile = 'a'.repeat(MAX_LINE_LENGTH);
    for (const pattern of ['a*a*b', 'a+a+$x', '.*.*z', '(a|b)c', 'a.*a.*z', '^a+$']) {
      const compiled = compilePattern(pattern);
      expect(compiled.ok, pattern).toBe(true);
      const started = performance.now();
      if (compiled.ok) compiled.regex.test(hostile);
      expect(performance.now() - started, pattern).toBeLessThan(250);
    }
  });
});

describe('tailFilteredLogs', () => {
  it('collapses a retry storm into one event with a repeat count', () => {
    const result = run();
    expect(result.matched_lines).toBeGreaterThan(5);
    expect(result.returned_lines).toBe(1);
    expect(result.lines[0]?.repeats).toBe(result.matched_lines);
    expect(result.lines[0]?.text).toContain('Connection refused');
  });

  it('returns far fewer tokens than the raw tail', () => {
    const result = run();
    expect(result.tokens.returned).toBeLessThan(result.tokens.raw_tail / 20);
    expect(result.tokens.returned).toBeLessThanOrEqual(base.token_budget);
  });

  it('strips ANSI only when asked', () => {
    expect(run({ strip_ansi: true }).lines[0]?.text).not.toContain(ESC);
    expect(run({ strip_ansi: false }).lines[0]?.text).toContain(ESC);
  });

  it('honours tail_lines', () => {
    expect(run({ tail_lines: 10 }).scanned_lines).toBe(10);
    expect(run({ tail_lines: 5000 }).scanned_lines).toBe(RAW_LOGS['web-gateway'].length);
  });

  it('truncates at the token budget and says so', () => {
    const result = run({ container: 'order-api', filter_pattern: '', token_budget: 64 });
    expect(result.truncated).toBe(true);
    expect(result.tokens.returned).toBeLessThanOrEqual(64);
  });

  it('reports an invalid pattern instead of throwing', () => {
    expect(tailFilteredLogs({ ...base, filter_pattern: '(' })).toMatchObject({ ok: false });
  });

  it('numbers lines from the start of the full log', () => {
    const result = run({ tail_lines: 20 });
    const total = RAW_LOGS['web-gateway'].length;
    expect(result.lines.every((line) => line.line > total - 20 && line.line <= total)).toBe(true);
  });
});

describe('fixtures', () => {
  it.each(CONTAINER_IDS)('%s has a deterministic, non-trivial log', (container) => {
    expect(RAW_LOGS[container].length).toBeGreaterThanOrEqual(80);
  });

  it('gives redis four identical crash cycles', () => {
    const result = run({ container: 'cache-redis', filter_pattern: 'starting|saving|overcommit', tail_lines: 80 });
    expect(result.returned_lines).toBe(4);
    expect(result.lines.every((line) => line.repeats === 4)).toBe(true);
  });
});
