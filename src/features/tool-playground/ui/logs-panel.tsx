import { useState } from 'react';
import { MAX_PATTERN_LENGTH } from '@bridge/core/filter-pattern';
import type { TailArgs } from '@/mock-bridge/log-filter';
import { Field, TextInput } from '@/shared/ui/field';
import { Toggle } from '@/shared/ui/toggle';
import { TAIL_DEFAULTS, runTail } from '../model/tool-runs';
import { ContainerSelect } from './container-select';
import { TailRanges } from './tail-ranges';
import { ToolPanel } from './tool-panel';

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
      <TailRanges args={args} patch={patch} maxTail={200} maxBudget={1024} />
    </ToolPanel>
  );
}
