import { useState } from 'react';
import { pretty } from '@/mock-bridge/rpc';
import { TOOL_SPECS, type ToolName } from '@bridge/core/tool-specs';
import { estimateTokens } from '@/shared/lib/tokens';
import { Badge } from '@/shared/ui/badge';
import { CodeBlock } from '@/shared/ui/code-block';
import { TabPanel, Tabs, type TabItem } from '@/shared/ui/tabs';
import type { ToolRun } from '../model/tool-runs';

type View = 'response' | 'request' | 'schema';

const VIEWS: Array<TabItem<View>> = [
  { id: 'response', label: 'Sample output' },
  { id: 'request', label: 'Request' },
  { id: 'schema', label: 'Schema JSON' },
];

interface ToolOutputProps {
  tool: ToolName;
  run: ToolRun;
}

/** Live JSON-RPC payloads for the current inputs, plus the tool's schema. */
export function ToolOutput({ tool, run }: ToolOutputProps) {
  const [view, setView] = useState<View>('response');
  const payload: Record<View, string> = {
    response: run.response,
    request: run.request,
    schema: pretty(TOOL_SPECS[tool]),
  };
  const idPrefix = `${tool}-view`;

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-cyan-500/20 bg-carbon-950/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/15 px-3 py-2">
        <Tabs label="Payload view" idPrefix={idPrefix} tabs={VIEWS} active={view} onChange={setView} />
        <span className="flex flex-wrap items-center gap-2" data-testid="tool-status">
          <Badge tone={run.status.tone}>{run.status.label}</Badge>
          <Badge tone="signal">≈ {estimateTokens(run.response)} tokens</Badge>
        </span>
      </div>
      <TabPanel idPrefix={idPrefix} active={view}>
        <CodeBlock text={payload[view]} language="json" label={`${tool} ${view}`} className="h-[26rem]" />
      </TabPanel>
    </div>
  );
}
