import { useState, type ReactNode } from 'react';
import { useProjectChoice, useServiceChoice, useTopology } from '../hooks/use-console';
import type { Polled } from '../hooks/use-polling';
import type { EngineSummary, EngineUp } from '../model/console-api';
import { InspectSection, type InspectTool } from './inspect-section';
import { Notice } from './notice';
import { StacksSection } from './stacks-section';

const Standalone = ({ children }: { children: ReactNode }) => <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">{children}</div>;

/** The stacks and the inspector, for an engine that answers and has projects on it. */
function Workbench({ engine }: { engine: EngineUp }) {
  const [project, chooseProject] = useProjectChoice(engine);
  const [live, setLive] = useState(true);
  const [tool, setTool] = useState<InspectTool>('logs');
  const state = useTopology(project, live);
  const topology = state.topology?.project === project ? state.topology : null;
  const [container, chooseContainer] = useServiceChoice(topology);
  if (project === null) return null;
  return (
    <>
      <StacksSection
        engine={engine}
        project={project}
        onProject={chooseProject}
        live={live}
        onToggleLive={() => setLive((value) => !value)}
        state={state}
        selected={container}
        onInspect={chooseContainer}
      />
      {topology && container && (
        <InspectSection
          project={project}
          services={topology.services.map((service) => service.name)}
          container={container}
          onContainer={chooseContainer}
          tool={tool}
          onTool={setTool}
          bridge={engine.bridge}
        />
      )}
    </>
  );
}

/** Everything that depends on the engine, or a plain statement of why it cannot be shown. */
export function EngineStage({ engine }: { engine: Polled<EngineSummary> }) {
  const { data, error } = engine;
  if (data === null) {
    return (
      <Standalone>
        {error ? (
          <Notice tone="crit" title="the console service is not answering" alert>
            {error} Start it with <code className="font-mono text-ink">docker compose up -d console</code>.
          </Notice>
        ) : (
          <p className="font-mono text-sm text-ink-mute">Connecting to the Docker Engine…</p>
        )}
      </Standalone>
    );
  }
  if (!data.reachable) {
    return (
      <Standalone>
        <Notice tone="crit" title="the Docker Engine is not answering" alert>
          {data.error}
        </Notice>
      </Standalone>
    );
  }
  if (data.projects.length === 0) {
    return (
      <Standalone>
        <Notice tone="signal" title="no compose project is visible">
          The engine answers, but the bridge sees no container that belongs to a compose project
          {data.bridge.scope ? ` within its scope (${data.bridge.scope.join(', ')})` : ''}.
        </Notice>
      </Standalone>
    );
  }
  return <Workbench engine={data} />;
}
