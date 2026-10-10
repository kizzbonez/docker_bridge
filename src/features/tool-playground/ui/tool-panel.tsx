import type { ReactNode } from 'react';
import { TOOL_SPECS, type ToolName } from '@/mock-bridge/tool-specs';
import { Badge } from '@/shared/ui/badge';
import type { ToolRun } from '../model/tool-runs';
import { ToolOutput } from './tool-output';

interface ToolPanelProps {
  tool: ToolName;
  run: ToolRun;
  /** The parameter controls. */
  children: ReactNode;
}

/** Shared two-column layout: description + parameters on the left, payloads on the right. */
export function ToolPanel({ tool, run, children }: ToolPanelProps) {
  const spec = TOOL_SPECS[tool];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <p className="text-sm leading-relaxed text-ink-dim">{spec.description}</p>
        <p className="flex flex-wrap gap-2">
          <Badge tone={spec.annotations.readOnlyHint ? 'ok' : 'warn'}>
            {spec.annotations.readOnlyHint ? 'read-only' : 'guarded exec'}
          </Badge>
          <Badge tone="mute">{spec.annotations.idempotentHint ? 'idempotent' : 'not idempotent'}</Badge>
        </p>
        {/* min-w-0: a fieldset otherwise grows to its widest child and overflows. */}
        <fieldset className="min-w-0 space-y-4">
          <legend className="eyebrow mb-3">Parameters</legend>
          {children}
        </fieldset>
      </div>
      <ToolOutput tool={tool} run={run} />
    </div>
  );
}
