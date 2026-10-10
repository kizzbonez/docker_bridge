import { cx } from '@/shared/lib/cx';
import { tokenizeJson, type JsonTokenKind } from '@/shared/lib/json-tokens';

export type CodeLanguage = 'json' | 'diff' | 'text';

const JSON_CLASS: Record<JsonTokenKind, string> = {
  key: 'text-sky-300',
  string: 'text-emerald-400',
  number: 'text-amber-400',
  literal: 'text-amber-400',
  plain: 'text-ink-mute',
};

function JsonText({ text }: { text: string }) {
  return tokenizeJson(text).map((token, index) => (
    <span key={index} className={JSON_CLASS[token.kind]}>
      {token.value}
    </span>
  ));
}

function diffClass(line: string): string {
  if (line.startsWith('@@')) return 'text-sky-400';
  if (line.startsWith('+')) return 'bg-emerald-500/10 text-emerald-400';
  if (line.startsWith('-')) return 'bg-red-500/10 text-red-400';
  return 'text-ink-mute';
}

function DiffText({ text }: { text: string }) {
  return text.split('\n').map((line, index) => (
    <span key={index} className={cx('block', diffClass(line))}>
      {line === '' ? ' ' : line}
    </span>
  ));
}

interface CodeTextProps {
  text: string;
  language: CodeLanguage;
}

/** Colours code as React spans — no innerHTML, so it is safe for any input. */
export function CodeText({ text, language }: CodeTextProps) {
  if (language === 'json') return <JsonText text={text} />;
  if (language === 'diff') return <DiffText text={text} />;
  return <span className="text-ink-dim">{text}</span>;
}
