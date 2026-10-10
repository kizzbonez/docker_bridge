import { useState } from 'react';
import { MAX_PATTERN_LENGTH } from '@/mock-bridge/filter-pattern';
import type { TailArgs } from '@/mock-bridge/log-filter';
import { Field, RangeInput, TextInput } from '@/shared/ui/field';
import { Toggle } from '@/shared/ui/toggle';
import { TAIL_DEFAULTS, runTail } from '../model/tool-runs';
import { ContainerSelect } from './container-select';
import { ToolPanel } from './tool-panel';

interface FormProps {
  args: TailArgs;
  patch: (change: Partial<TailArgs>) => void;
}

function Ranges({ args, patch }: FormProps) {
  return (
    <>
      <Field label="tail_lines" htmlFor="logs-tail" hint={args.tail_lines}>
        <RangeInput
          id="logs-tail"
          min={10}
          max={200}
          step={10}
          value={args.tail_lines}
          onChange={(event) => patch({ tail_lines: Number(event.target.value) })}
        />
      </Field>
      <Field label="token_budget" htmlFor="logs-budget" hint={`${args.token_budget} tokens`}>
        <RangeInput
          id="logs-budget"
          min={64}
          max={1024}
          step={32}
          value={args.token_budget}
          onChange={(event) => patch({ token_budget: Number(event.target.value) })}
        />
      </Field>
    </>
  );
}

export function LogsPanel() {
  const [args, setArgs] = useState<TailArgs>(TAIL_DEFAULTS);
  const patch = (change: Partial<TailArgs>): void => setArgs((current) => ({ ...current, ...change }));

  return (
    <ToolPanel tool="docker_tail_filtered_logs" run={runTail(args)}>
      <ContainerSelect id="logs-container" value={args.container} onChange={(container) => patch({ container })} />
      <Field label="filter_pattern" htmlFor="logs-pattern" hint="regex, case-insensitive">
        <TextInput
          id="logs-pattern"
          value={args.filter_pattern}
          maxLength={MAX_PATTERN_LENGTH + 20}
          onChange={(event) => patch({ filter_pattern: event.target.value })}
        />
      </Field>
      <Toggle id="logs-ansi" label="strip_ansi" checked={args.strip_ansi} onChange={(strip_ansi) => patch({ strip_ansi })} />
      <Ranges args={args} patch={patch} />
    </ToolPanel>
  );
}
