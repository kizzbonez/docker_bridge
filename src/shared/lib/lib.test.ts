import { describe, expect, it } from 'vitest';
import { ESC, countAnsi, paint, revealAnsi, stripAnsi } from './ansi';
import { parseCsv } from './csv';
import { cx } from './cx';
import { clamp, formatInt, formatPercent, formatUsd } from './format';
import { tokenizeJson } from './json-tokens';
import { noise } from './noise';
import { estimateTokens } from './tokens';

describe('parseCsv', () => {
  it('parses a header row into records', () => {
    expect(parseCsv('a,b\n1,2\n3,4')).toEqual([
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]);
  });

  it('skips comment and blank lines and tolerates CRLF', () => {
    expect(parseCsv('# note\r\n\r\na,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }]);
  });

  it('keeps commas and escaped quotes inside quoted cells', () => {
    expect(parseCsv('name,pattern\nx,"a,b ""c"""')).toEqual([{ name: 'x', pattern: 'a,b "c"' }]);
  });

  it('fills missing cells with an empty string', () => {
    expect(parseCsv('a,b\n1')).toEqual([{ a: '1', b: '' }]);
  });

  it('returns nothing for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('ansi', () => {
  const coloured = paint(31, 'boom');

  it('wraps and strips SGR sequences', () => {
    expect(coloured).toBe(`${ESC}[31mboom${ESC}[0m`);
    expect(stripAnsi(coloured)).toBe('boom');
    expect(countAnsi(coloured)).toBe(2);
    expect(countAnsi('plain')).toBe(0);
  });

  it('makes escape bytes visible', () => {
    expect(revealAnsi(coloured)).toBe('␛[31mboom␛[0m');
  });
});

describe('tokenizeJson', () => {
  it('classifies keys, strings, numbers and literals', () => {
    const kinds = tokenizeJson('{"a": "b", "n": -1.5, "ok": true, "x": null}')
      .filter((token) => token.kind !== 'plain')
      .map((token) => `${token.kind}:${token.value}`);
    expect(kinds).toEqual(['key:"a"', 'string:"b"', 'key:"n"', 'number:-1.5', 'key:"ok"', 'literal:true', 'key:"x"', 'literal:null']);
  });

  it('round-trips the source text exactly', () => {
    const source = '{\n  "msg": "say \\"hi\\"",\n  "list": [1, 2]\n}';
    expect(tokenizeJson(source).map((token) => token.value).join('')).toBe(source);
  });

  it('tolerates a string cut off mid-stream', () => {
    const tokens = tokenizeJson('{"name": "docker_get');
    expect(tokens.at(-1)).toEqual({ kind: 'string', value: '"docker_get' });
  });
});

describe('format', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('formats integers, money and percentages', () => {
    expect(formatInt(18400.4)).toBe('18,400');
    expect(formatUsd(0.0552)).toBe('$0.0552');
    expect(formatUsd(0.00096)).toBe('$0.0010');
    expect(formatUsd(12.5)).toBe('$12.50');
    expect(formatPercent(0.9826)).toBe('98%');
    expect(formatPercent(0.0192, 1)).toBe('1.9%');
  });
});

describe('small helpers', () => {
  it('cx joins truthy parts', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('estimateTokens rounds up at four characters per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('noise is deterministic and bounded', () => {
    expect(noise(7, 3)).toBe(noise(7, 3));
    for (let tick = 0; tick < 200; tick += 1) {
      expect(Math.abs(noise(tick, 2))).toBeLessThanOrEqual(1);
    }
  });
});
