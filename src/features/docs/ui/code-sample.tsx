import { CodeBlock } from '@/shared/ui/code-block';
import type { CodeLanguage } from '@/shared/ui/code-text';
import { CopyButton } from '@/shared/ui/copy-button';

interface CodeSampleProps {
  /** File name or short description shown in the title bar. */
  title: string;
  text: string;
  language?: CodeLanguage;
  /** Caps the height and scrolls; use for long payloads. */
  tall?: boolean;
}

/** A titled, copyable code block. */
export function CodeSample({ title, text, language = 'text', tall = false }: CodeSampleProps) {
  return (
    <figure className="overflow-hidden rounded-xl border border-cyan-500/20 bg-carbon-950/80">
      <figcaption className="flex items-center justify-between gap-3 border-b border-cyan-500/15 px-4 py-2">
        <span className="min-w-0 truncate font-mono text-xs text-ink-mute">{title}</span>
        <CopyButton text={text} variant="quiet" className="px-2 py-1 text-xs" />
      </figcaption>
      <CodeBlock text={text} language={language} label={title} className={tall ? 'max-h-80' : undefined} />
    </figure>
  );
}
