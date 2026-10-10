export type JsonTokenKind = 'key' | 'string' | 'number' | 'literal' | 'plain';

export interface JsonToken {
  kind: JsonTokenKind;
  value: string;
}

// Groups: 1 key, 2 string (closing quote optional so half-typed text still
// colours), 3 number, 4 literal. Every alternative consumes at least one char.
const PATTERN = /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*"?)|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g;
const GROUP_KINDS: JsonTokenKind[] = ['key', 'string', 'number', 'literal'];

function kindOf(match: RegExpMatchArray): JsonTokenKind {
  const group = [match[1], match[2], match[3], match[4]].findIndex((part) => part !== undefined);
  return GROUP_KINDS[group] ?? 'plain';
}

/** Lenient JSON lexer for syntax colouring. Tolerates truncated input. */
export function tokenizeJson(source: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let cursor = 0;
  for (const match of source.matchAll(PATTERN)) {
    const start = match.index;
    if (start > cursor) tokens.push({ kind: 'plain', value: source.slice(cursor, start) });
    tokens.push({ kind: kindOf(match), value: match[0] });
    cursor = start + match[0].length;
  }
  if (cursor < source.length) tokens.push({ kind: 'plain', value: source.slice(cursor) });
  return tokens;
}
