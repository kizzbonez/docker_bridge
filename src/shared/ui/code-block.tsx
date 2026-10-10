import { cx } from '@/shared/lib/cx';
import { CodeText, type CodeLanguage } from './code-text';

interface CodeBlockProps {
  text: string;
  language: CodeLanguage;
  /** Accessible name; the block is focusable so keyboard users can scroll it. */
  label: string;
  className?: string;
}

export function CodeBlock({ text, language, label, className }: CodeBlockProps) {
  return (
    <pre tabIndex={0} role="group" aria-label={label} className={cx('code-pane whitespace-pre p-4', className)}>
      <code>
        <CodeText text={text} language={language} />
      </code>
    </pre>
  );
}
