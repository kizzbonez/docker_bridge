export const MAX_PATTERN_LENGTH = 120;

// A quantified group that itself contains a quantifier, e.g. (a+)+ — the
// classic catastrophic-backtracking shape. A real server would use RE2.
const NESTED_QUANTIFIER = /\([^)]*[+*][^)]*\)[+*{]/;

export type CompiledPattern = { ok: true; regex: RegExp } | { ok: false; message: string };

/** Validates and compiles a caller-supplied filter. An empty pattern matches everything. */
export function compilePattern(source: string): CompiledPattern {
  if (source.length > MAX_PATTERN_LENGTH) {
    return { ok: false, message: `filter_pattern exceeds ${MAX_PATTERN_LENGTH} characters` };
  }
  if (NESTED_QUANTIFIER.test(source)) {
    return { ok: false, message: 'filter_pattern rejected: nested quantifiers (ReDoS guard)' };
  }
  try {
    return { ok: true, regex: new RegExp(source, 'i') };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'syntax error';
    return { ok: false, message: `filter_pattern is not a valid regular expression: ${detail}` };
  }
}
