import { useEffect, useRef } from 'react';
import type { Step } from '../model/types';
import { TerminalLine } from './terminal-line';

function Banner() {
  return (
    <div className="mb-4 rounded-md border border-cyan-500/20 px-3 py-2 text-ink-dim">
      <p>
        <span className="text-amber-400">✻</span> Agent session <span className="text-ink-mute">· ~/shop-stack</span>
      </p>
      <p className="text-ink-mute">
        MCP <span className="text-emerald-400">✔ docker-debug-bridge</span> · 3 tools · stdio
      </p>
    </div>
  );
}

function IdleHint() {
  return (
    <p className="text-ink-mute">
      <span className="mr-2 text-sky-400">❯</span>
      Pick an incident below to watch the agent debug it live.
      <span aria-hidden="true" className="ml-1 inline-block h-[1.05em] w-[0.5em] translate-y-[0.18em] animate-caret bg-cyan-400" />
    </p>
  );
}

interface TerminalOutputProps {
  steps: Step[];
  stepIndex: number;
  chars: number;
}

/** The scrolling transcript. Follows the stream by pinning to the bottom. */
export function TerminalOutput({ steps, stepIndex, chars }: TerminalOutputProps) {
  const pane = useRef<HTMLDivElement>(null);
  const active = steps[stepIndex];

  useEffect(() => {
    const node = pane.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [stepIndex, chars]);

  return (
    <div
      ref={pane}
      role="log"
      aria-live="off"
      aria-label="Agent terminal output"
      tabIndex={0}
      data-testid="terminal-output"
      className="h-[30rem] space-y-3 overflow-y-auto bg-carbon-950/80 p-4 font-mono text-[12.5px] leading-relaxed"
    >
      <Banner />
      {steps.length === 0 && <IdleHint />}
      {steps.slice(0, stepIndex).map((step, index) => (
        <TerminalLine key={index} step={step} text={step.text} />
      ))}
      {active && <TerminalLine step={active} text={active.text.slice(0, chars)} typing />}
    </div>
  );
}
