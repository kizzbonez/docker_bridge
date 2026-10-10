import { useState } from 'react';
import type { TopologyArgs } from '@/mock-bridge/topology';
import { Field, TextInput } from '@/shared/ui/field';
import { Toggle } from '@/shared/ui/toggle';
import { TOPOLOGY_DEFAULTS, runTopology } from '../model/tool-runs';
import { ToolPanel } from './tool-panel';

export function TopologyPanel() {
  const [args, setArgs] = useState<TopologyArgs>(TOPOLOGY_DEFAULTS);
  const patch = (change: Partial<TopologyArgs>): void => setArgs((current) => ({ ...current, ...change }));

  return (
    <ToolPanel tool="docker_get_stack_topology" run={runTopology(args)}>
      <Field label="project" htmlFor="topology-project">
        <TextInput
          id="topology-project"
          value={args.project}
          maxLength={40}
          onChange={(event) => patch({ project: event.target.value })}
        />
      </Field>
      <Toggle
        id="topology-metrics"
        label="include_metrics"
        checked={args.include_metrics}
        onChange={(include_metrics) => patch({ include_metrics })}
      />
      <Toggle
        id="topology-stopped"
        label="include_stopped"
        checked={args.include_stopped}
        onChange={(include_stopped) => patch({ include_stopped })}
      />
    </ToolPanel>
  );
}
