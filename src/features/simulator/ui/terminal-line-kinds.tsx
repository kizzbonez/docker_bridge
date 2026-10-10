import type { ReactNode } from 'react';
import { estimateTokens } from '@/shared/lib/tokens';
import { CodeText } from '@/shared/ui/code-text';
import type { Step } from '../model/types';

export interface LineProps {
  step: Step;
  /** The part of `step.text` revealed so far. */
  text: string;
  caret: ReactNode;
}

const PAYLOAD = 'mt-1 ml-1.5 border-l border-cyan-500/20 pl-3 break-words whitespace-pre-wrap';

export function PromptLine({ text, caret }: LineProps) {
  return (
    <p className="text-ink">
      <span className="mr-2 text-sky-400">❯</span>
      {text}
      {caret}
    </p>
  );
}

export function ThoughtLine({ text, caret }: LineProps) {
  return (
    <p className="text-ink-mute italic">
      <span className="mr-2 text-amber-400 not-italic">✻</span>
      {text}
      {caret}
    </p>
  );
}

export function CallLine({ step, text, caret }: LineProps) {
  return (
    <div>
      <p className="text-ink">
        <span className="mr-2 text-emerald-400">⏺</span>
        docker-debug-bridge · <span className="text-cyan-300">{step.label}</span>{' '}
        <span className="text-ink-mute">(MCP)</span>
      </p>
      <pre className={PAYLOAD}>
        <CodeText language="json" text={text} />
        {caret}
      </pre>
    </div>
  );
}

export function ResultLine({ step, text, caret }: LineProps) {
  return (
    <div>
      <p className="text-ink-mute">
        <span className="mr-2">⎿</span>
        result <span className="text-emerald-400">≈ {estimateTokens(step.text)} tokens</span>
      </p>
      <pre className={PAYLOAD}>
        <CodeText language="json" text={text} />
        {caret}
      </pre>
    </div>
  );
}

export function DiffLine({ step, text, caret }: LineProps) {
  return (
    <div>
      <p className="text-ink">
        <span className="mr-2 text-emerald-400">⏺</span>
        Update(<span className="text-cyan-300">{step.label}</span>)
      </p>
      <pre className="mt-1 ml-1.5 rounded-md border border-cyan-500/15 bg-carbon-900/80 p-2 break-words whitespace-pre-wrap">
        <CodeText language="diff" text={text} />
        {caret}
      </pre>
    </div>
  );
}

export function VerdictLine({ text, caret }: LineProps) {
  return (
    <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 whitespace-pre-wrap text-emerald-400">
      <span className="mr-2">✔</span>
      {text}
      {caret}
    </p>
  );
}
