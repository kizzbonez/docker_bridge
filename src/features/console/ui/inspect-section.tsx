import { Field, SelectInput } from '@/shared/ui/field';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { Section } from '@/shared/ui/section';
import { TabPanel, Tabs, type TabItem } from '@/shared/ui/tabs';
import type { BridgeInfo } from '../model/console-api';
import { ExecTool } from './exec-tool';
import { LogsTool } from './logs-tool';

export type InspectTool = 'logs' | 'exec';

const TOOLS: Array<TabItem<InspectTool>> = [
  { id: 'logs', label: 'docker_tail_filtered_logs' },
  { id: 'exec', label: 'docker_safe_exec' },
];

interface InspectSectionProps {
  project: string;
  /** The services of the project on screen. */
  services: string[];
  container: string;
  onContainer: (name: string) => void;
  /** Kept by the parent, so the choice survives switching project. */
  tool: InspectTool;
  onTool: (tool: InspectTool) => void;
  bridge: BridgeInfo;
}

/** Logs and exec for one container of the selected project. */
export function InspectSection({ project, services, container, onContainer, tool, onTool, bridge }: InspectSectionProps) {
  return (
    <Section
      id="inspect"
      index="02"
      eyebrow="inspect"
      title="Look inside a container"
      lead="The two tools an agent reaches for after the topology: a filtered log tail, and one guarded diagnostic command. They run for real, and each run is put on record."
    >
      <GlassPanel className="p-4 sm:p-6">
        <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6">
          <Field label="container" htmlFor="inspect-container" hint={project}>
            <SelectInput id="inspect-container" value={container} onChange={(event) => onContainer(event.target.value)}>
              {services.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Tabs label="Tool" idPrefix="inspect" tabs={TOOLS} active={tool} onChange={onTool} />
        </div>
        <TabPanel idPrefix="inspect" active={tool} className="mt-6">
          {tool === 'logs' ? <LogsTool project={project} container={container} /> : <ExecTool project={project} container={container} bridge={bridge} />}
        </TabPanel>
      </GlassPanel>
    </Section>
  );
}
