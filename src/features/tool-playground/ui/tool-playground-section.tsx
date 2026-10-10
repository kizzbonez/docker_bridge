import { memo, useState, type ComponentType } from 'react';
import { TOOL_NAMES, type ToolName } from '@bridge/core/tool-specs';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { Section } from '@/shared/ui/section';
import { TabPanel, Tabs } from '@/shared/ui/tabs';
import { ExecPanel } from './exec-panel';
import { LogsPanel } from './logs-panel';
import { TopologyPanel } from './topology-panel';

const TABS = TOOL_NAMES.map((name) => ({ id: name, label: name }));

const PANELS: Record<ToolName, ComponentType> = {
  docker_get_stack_topology: TopologyPanel,
  docker_tail_filtered_logs: LogsPanel,
  docker_safe_exec: ExecPanel,
};

export const ToolPlaygroundSection = memo(function ToolPlaygroundSection() {
  const [tool, setTool] = useState<ToolName>('docker_get_stack_topology');
  const Panel = PANELS[tool];
  return (
    <Section
      id="tools"
      index="04"
      eyebrow="MCP tool schema & playground"
      title="Three tools. Inspect them, then break them."
      lead="Change a parameter and the JSON-RPC request and response update instantly. Try a destructive command or a runaway regex and watch the guardrails answer."
    >
      <GlassPanel className="p-4 sm:p-6">
        <Tabs label="MCP tools" idPrefix="tool" tabs={TABS} active={tool} onChange={setTool} />
        <TabPanel idPrefix="tool" active={tool} className="mt-6">
          <Panel />
        </TabPanel>
      </GlassPanel>
    </Section>
  );
});
