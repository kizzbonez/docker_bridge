import type { ReactNode } from 'react';
import { Notice } from './notice';

interface ResultFrameProps {
  /** Shown in the header bar: what was asked and how it went. */
  summary: ReactNode;
  children: ReactNode;
}

/** The bordered pane a tool's answer is shown in. */
export function ResultFrame({ summary, children }: ResultFrameProps) {
  return (
    <div data-testid="tool-result" className="min-w-0 overflow-hidden rounded-xl border border-cyan-500/20 bg-carbon-950/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/15 px-3 py-2">{summary}</div>
      {children}
    </div>
  );
}

interface PendingResultProps {
  pending: boolean;
  problem: string | null;
  /** What to say before anything has been run. */
  invitation: string;
}

/** What the result column shows when there is no answer to show. */
export function PendingResult({ pending, problem, invitation }: PendingResultProps) {
  if (problem) {
    return (
      <Notice tone="crit" title="the request was not accepted" alert>
        {problem}
      </Notice>
    );
  }
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-cyan-500/20 p-6">
      <p className="text-center font-mono text-sm text-ink-mute">{pending ? 'Asking the engine…' : invitation}</p>
    </div>
  );
}
