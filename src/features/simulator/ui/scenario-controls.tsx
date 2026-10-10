import { cx } from '@/shared/lib/cx';
import { toneSoft, toneText } from '@/shared/lib/tone';
import { Button } from '@/shared/ui/button';
import type { Simulator } from '../hooks/use-simulator';
import { SCENARIOS } from '../model/scenarios';
import { SCENARIO_IDS, type Scenario } from '../model/types';

interface ScenarioButtonProps {
  scenario: Scenario;
  active: boolean;
  onStart: (id: Scenario['id']) => void;
}

function ScenarioButton({ scenario, active, onStart }: ScenarioButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onStart(scenario.id)}
      className={cx(
        'rounded-lg border px-3 py-2 text-left font-mono text-xs transition-all duration-300 hover:brightness-125',
        toneSoft[scenario.tone],
        toneText[scenario.tone],
        active && 'ring-1 ring-current',
      )}
    >
      <span aria-hidden="true" className="mr-1.5">
        ▶
      </span>
      {scenario.button}
    </button>
  );
}

/** Incident triggers plus transport controls for the running diagnostic. */
export function ScenarioControls({ simulator }: { simulator: Simulator }) {
  const { status, playback, start, skip, applyFix, reset } = simulator;
  return (
    <div className="space-y-2 border-t border-cyan-500/15 bg-carbon-900/80 p-4">
      <div className="flex flex-wrap gap-2">
        {SCENARIO_IDS.map((id) => (
          <ScenarioButton key={id} scenario={SCENARIOS[id]} active={playback.scenarioId === id} onStart={start} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <Button variant="quiet" className="px-2.5 py-1.5 text-xs" onClick={skip} disabled={status !== 'running'}>
          ⏭ Skip to result
        </Button>
        <Button variant="quiet" className="px-2.5 py-1.5 text-xs" onClick={applyFix} disabled={status !== 'done'}>
          ✔ Apply fix
        </Button>
        <Button variant="quiet" className="px-2.5 py-1.5 text-xs" onClick={reset} disabled={status === 'idle'}>
          ↺ Reset
        </Button>
      </div>
    </div>
  );
}
