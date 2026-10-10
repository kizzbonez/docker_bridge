import { toneText, type Tone } from '@/shared/lib/tone';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { WindowChrome } from '@/shared/ui/window-chrome';
import type { Simulator } from '../hooks/use-simulator';
import type { PlaybackStatus } from '../model/types';
import { ScenarioControls } from './scenario-controls';
import { TerminalOutput } from './terminal-output';

const STATUS: Record<PlaybackStatus, { label: string; tone: Tone; announce: string }> = {
  idle: { label: 'idle', tone: 'mute', announce: 'Simulator idle.' },
  running: { label: 'diagnosing', tone: 'warn', announce: 'Diagnostic running.' },
  done: { label: 'fix proposed', tone: 'signal', announce: 'Diagnostic complete. A fix has been proposed.' },
  resolved: { label: 'resolved', tone: 'ok', announce: 'Fix applied. The stack is healthy.' },
};

/** Left pane: the agent's terminal window. */
export function AgentTerminal({ simulator }: { simulator: Simulator }) {
  const { playback, status, steps } = simulator;
  const state = STATUS[status];
  return (
    <GlassPanel>
      <div className="overflow-hidden rounded-xl">
        <WindowChrome
          title="agent — ~/shop-stack"
          aside={<span className={toneText[state.tone]}>● {state.label}</span>}
        />
        <TerminalOutput steps={steps} stepIndex={playback.stepIndex} chars={playback.chars} />
        <ScenarioControls simulator={simulator} />
      </div>
      <p role="status" className="sr-only">
        {state.announce}
      </p>
    </GlassPanel>
  );
}
