import { useState } from 'react';
import { CodeText } from '@/shared/ui/code-text';
import { RawLog } from './raw-log';

const PANE = 'code-pane h-full min-w-0 overflow-hidden px-4 pt-11 pb-4 whitespace-pre';
const TAG = 'absolute top-3 left-3 rounded border bg-carbon-950/90 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase';
const MIN_SPLIT = 15;
const MAX_SPLIT = 85;

interface CompareSliderProps {
  rawLines: string[];
  filtered: string;
}

/**
 * Before/after split view. A full-size, invisible range input is the control,
 * so the divider is draggable, keyboard-operable and announced to screen
 * readers. Each pane keeps its own left edge, so both stay readable.
 */
export function CompareSlider({ rawLines, filtered }: CompareSliderProps) {
  const [split, setSplit] = useState(50);
  return (
    <div data-testid="compare-slider" className="relative flex h-72 overflow-hidden rounded-xl border border-cyan-500/20 bg-carbon-950">
      <div className="relative shrink-0 bg-carbon-900" style={{ width: `${split}%` }} data-testid="compare-raw">
        <span className={`${TAG} border-red-500/40 text-red-400`}>raw · docker logs</span>
        <pre className={PANE} role="group" aria-label="Raw docker logs">
          <RawLog lines={rawLines} />
        </pre>
      </div>
      <div className="relative min-w-0 flex-1">
        <span className={`${TAG} border-emerald-500/40 text-emerald-400`}>filtered · mcp</span>
        <pre className={PANE} role="group" aria-label="Filtered MCP tool output">
          <CodeText language="json" text={filtered} />
        </pre>
      </div>
      <input
        type="range"
        min={MIN_SPLIT}
        max={MAX_SPLIT}
        value={split}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label="Comparison divider: raw logs on the left, filtered output on the right"
        className="peer absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.8)] peer-focus-visible:bg-sky-300 peer-focus-visible:shadow-[0_0_0_3px_rgba(56,189,248,0.5)]"
        style={{ left: `${split}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400 bg-carbon-900 font-mono text-xs text-cyan-300">
          ⇆
        </span>
      </span>
    </div>
  );
}
