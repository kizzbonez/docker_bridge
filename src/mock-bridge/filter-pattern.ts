export const MAX_PATTERN_LENGTH = 120;
/** Longest slice of a log line the filter will look at. */
export const MAX_LINE_LENGTH = 300;
const MAX_UNBOUNDED_QUANTIFIERS = 2;

/**
 * Shapes that make a backtracking regex engine take exponential or
 * high-polynomial time. A real server would use a linear-time engine (RE2);
 * JavaScript has none, so the dangerous shapes are refused up front and the
 * input each pattern can see is kept short.
 */
const REDOS_SHAPES: Array<{ shape: RegExp; reason: string }> = [
  // (a+)+  (.*)*  (x+){2,}: a quantified group that contains a quantifier.
  { shape: /\([^)]*[+*][^)]*\)[+*{]/, reason: 'nested quantifiers' },
  // (a|aa)+  (.|.)*: a quantified group whose alternatives can overlap.
  { shape: /\([^)]*\|[^)]*\)[+*{]/, reason: 'a repeated group with alternatives' },
];

// *, + and {n,} with no upper bound. Escaped characters are removed first.
const UNBOUNDED = /[*+]|\{\d+,\}/g;
const ESCAPED = /\\./g;

export type CompiledPattern = { ok: true; regex: RegExp } | { ok: false; message: string };

function redosReason(source: string): string | null {
  const structural = source.replace(ESCAPED, '');
  const hit = REDOS_SHAPES.find(({ shape }) => shape.test(structural));
  if (hit) return hit.reason;
  const unbounded = structural.match(UNBOUNDED)?.length ?? 0;
  return unbounded > MAX_UNBOUNDED_QUANTIFIERS ? `more than ${MAX_UNBOUNDED_QUANTIFIERS} unbounded quantifiers` : null;
}

/** Validates and compiles a caller-supplied filter. An empty pattern matches everything. */
export function compilePattern(source: string): CompiledPattern {
  if (source.length > MAX_PATTERN_LENGTH) {
    return { ok: false, message: `filter_pattern exceeds ${MAX_PATTERN_LENGTH} characters` };
  }
  const reason = redosReason(source);
  if (reason) return { ok: false, message: `filter_pattern rejected: ${reason} (ReDoS guard)` };
  try {
    // The pattern is user input by design: this is a regex filter. It has
    // passed the length cap and the ReDoS screen above, it only ever runs in
    // the visitor's own browser, and callers test at most MAX_LINE_LENGTH
    // characters of each line.
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
    return { ok: true, regex: new RegExp(source, 'i') };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'syntax error';
    return { ok: false, message: `filter_pattern is not a valid regular expression: ${detail}` };
  }
}
