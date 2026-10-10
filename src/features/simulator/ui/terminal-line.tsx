import { memo, type ComponentType } from 'react';
import type { Step, StepKind } from '../model/types';
import {
  CallLine,
  DiffLine,
  PromptLine,
  ResultLine,
  ThoughtLine,
  VerdictLine,
  type LineProps,
} from './terminal-line-kinds';

const RENDERERS: Record<StepKind, ComponentType<LineProps>> = {
  prompt: PromptLine,
  thought: ThoughtLine,
  call: CallLine,
  result: ResultLine,
  diff: DiffLine,
  verdict: VerdictLine,
};

/** Shown while a step is "pending": thinking time or tool latency. */
const WAITING: Record<StepKind, string> = {
  prompt: 'Reading prompt…',
  thought: 'Thinking…',
  call: 'Calling tool…',
  result: 'Waiting for the MCP server…',
  diff: 'Drafting patch…',
  verdict: 'Summarising…',
};

function Caret() {
  return (
    <span aria-hidden="true" className="ml-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.18em] animate-caret bg-cyan-400" />
  );
}

interface TerminalLineProps {
  step: Step;
  text: string;
  typing?: boolean;
}

/** Memoised: finished lines never re-render while the next one streams. */
export const TerminalLine = memo(function TerminalLine({ step, text, typing = false }: TerminalLineProps) {
  if (typing && text === '') {
    return (
      <p className="animate-pulse text-ink-mute">
        {WAITING[step.kind]}
        <Caret />
      </p>
    );
  }
  const Renderer = RENDERERS[step.kind];
  return <Renderer step={step} text={text} caret={typing ? <Caret /> : null} />;
});
