import { EXEC_DEFAULTS, TAIL_DEFAULTS, TOPOLOGY_DEFAULTS, runExec, runTail, runTopology, type ToolRun } from '@/features/tool-playground/model/tool-runs';
import { TOOL_NAMES, TOOL_SPECS, type ToolName } from '@bridge/core/tool-specs';
import { Badge } from '@/shared/ui/badge';
import { CodeSample } from '../ui/code-sample';
import { DocSection } from '../ui/doc-section';
import { H3, P } from '../ui/prose';
import { ParamTable } from '../ui/param-table';

// Samples come from the same mock the playground runs, so they cannot go stale.
const SAMPLES: Record<ToolName, ToolRun> = {
  docker_get_stack_topology: runTopology(TOPOLOGY_DEFAULTS),
  docker_tail_filtered_logs: runTail(TAIL_DEFAULTS),
  docker_safe_exec: runExec(EXEC_DEFAULTS, true),
};

function ToolReference({ name }: { name: ToolName }) {
  const spec = TOOL_SPECS[name];
  const sample = SAMPLES[name];
  return (
    <div className="space-y-4" data-testid={`tool-ref-${name}`}>
      <H3 id={`tool-${name}`}>
        <span className="font-mono text-lg break-all text-cyan-300">{name}</span>
      </H3>
      <p className="flex flex-wrap gap-2">
        <Badge tone={spec.annotations.readOnlyHint ? 'ok' : 'warn'}>
          {spec.annotations.readOnlyHint ? 'readOnlyHint: true' : 'readOnlyHint: false'}
        </Badge>
        <Badge tone="mute">destructiveHint: {String(spec.annotations.destructiveHint)}</Badge>
        <Badge tone="mute">idempotentHint: {String(spec.annotations.idempotentHint)}</Badge>
      </p>
      <P>{spec.description}</P>
      <ParamTable tool={name} schema={spec.inputSchema} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CodeSample title="request · tools/call" language="json" text={sample.request} tall />
        <CodeSample title="response" language="json" text={sample.response} tall />
      </div>
    </div>
  );
}

export function ToolsReference() {
  return (
    <DocSection
      id="tools-reference"
      lead="Every tool takes a flat JSON object and returns structured content. The tables below are rendered from the same schemas the server advertises through tools/list."
    >
      {TOOL_NAMES.map((name) => (
        <ToolReference key={name} name={name} />
      ))}
      <P>
        Want to change the inputs? The <a href="/#tools" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-400">playground</a> recomputes
        the request and response as you type.
      </P>
    </DocSection>
  );
}
