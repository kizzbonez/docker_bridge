import { useState } from 'react';
import { EXEC_PRESETS } from '@/mock-bridge/exec-outputs';
import { MAX_COMMAND_LENGTH } from '@bridge/core/exec-policy';
import type { ExecArgs } from '@/mock-bridge/safe-exec';
import { Field, RangeInput, TextInput } from '@/shared/ui/field';
import { Toggle } from '@/shared/ui/toggle';
import { EXEC_DEFAULTS, runExec } from '../model/tool-runs';
import { ContainerSelect } from './container-select';
import { ToolPanel } from './tool-panel';

interface PresetsProps {
  commands: string[];
  onPick: (command: string) => void;
}

function Presets({ commands, onPick }: PresetsProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Example commands">
      {commands.map((command) => (
        <button
          key={command}
          type="button"
          onClick={() => onPick(command)}
          className="max-w-full truncate rounded border border-cyan-500/20 px-2 py-1 font-mono text-[11px] text-ink-dim transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
        >
          {command}
        </button>
      ))}
    </div>
  );
}

export function ExecPanel() {
  const [args, setArgs] = useState<ExecArgs>(EXEC_DEFAULTS);
  const [readOnly, setReadOnly] = useState(true);
  const patch = (change: Partial<ExecArgs>): void => setArgs((current) => ({ ...current, ...change }));

  return (
    <ToolPanel tool="docker_safe_exec" run={runExec(args, readOnly)}>
      <ContainerSelect
        id="exec-container"
        value={args.container}
        onChange={(container) => patch({ container, command: EXEC_PRESETS[container][0] ?? '' })}
      />
      <Field label="command" htmlFor="exec-command" hint="argv, no shell">
        <TextInput
          id="exec-command"
          value={args.command}
          maxLength={MAX_COMMAND_LENGTH + 20}
          onChange={(event) => patch({ command: event.target.value })}
        />
      </Field>
      <Presets commands={EXEC_PRESETS[args.container]} onPick={(command) => patch({ command })} />
      <Field label="timeout_ms" htmlFor="exec-timeout" hint={`${args.timeout_ms} ms`}>
        <RangeInput
          id="exec-timeout"
          min={250}
          max={10000}
          step={250}
          value={args.timeout_ms}
          onChange={(event) => patch({ timeout_ms: Number(event.target.value) })}
        />
      </Field>
      <Toggle id="exec-readonly" label="READ_ONLY_MODE (server env)" checked={readOnly} onChange={setReadOnly} />
    </ToolPanel>
  );
}
