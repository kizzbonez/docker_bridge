import { Button } from '@/shared/ui/button';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { Section } from '@/shared/ui/section';
import { StatusDot } from '@/shared/ui/status-dot';
import { TabPanel, Tabs } from '@/shared/ui/tabs';
import type { LiveTopology } from '../hooks/use-console';
import type { EngineUp, Topology } from '../model/console-api';
import { Notice } from './notice';
import { ServiceCard } from './service-card';

interface GridProps {
  topology: Topology;
  selected: string | null;
  onInspect: (name: string) => void;
}

function ServiceGrid({ topology, selected, onInspect }: GridProps) {
  const needs = (name: string): string[] => topology.edges.filter((edge) => edge.from === name).map((edge) => edge.to);
  return (
    <>
      {topology.unhealthy.length > 0 && (
        <div className="mb-4">
          <Notice tone="crit" title={`needs attention: ${topology.unhealthy.join(', ')}`} />
        </div>
      )}
      <div data-testid="service-grid" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {topology.services.map((service) => (
          <ServiceCard key={service.name} service={service} dependsOn={needs(service.name)} selected={service.name === selected} onInspect={onInspect} />
        ))}
      </div>
    </>
  );
}

interface LiveControlProps {
  live: boolean;
  onToggle: () => void;
}

function LiveControl({ live, onToggle }: LiveControlProps) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] text-ink-mute">
      <span className="flex items-center gap-2">
        <StatusDot tone={live ? 'ok' : 'mute'} ping={live} />
        {live ? 'refreshing every 8 s' : 'paused'}
      </span>
      <Button variant="quiet" className="px-2.5 py-1 text-xs" aria-pressed={!live} onClick={onToggle}>
        {live ? 'Pause' : 'Resume'}
      </Button>
    </p>
  );
}

interface StacksSectionProps {
  engine: EngineUp;
  project: string;
  onProject: (name: string) => void;
  live: boolean;
  onToggleLive: () => void;
  state: LiveTopology;
  selected: string | null;
  onInspect: (name: string) => void;
}

/** The compose projects on the engine, one at a time, as `docker_get_stack_topology` reports them. */
export function StacksSection({ engine, project, onProject, live, onToggleLive, state, selected, onInspect }: StacksSectionProps) {
  const tabs = engine.projects.map(({ name, running, total }) => ({ id: name, label: `${name} ${running}/${total}` }));
  const current = state.topology?.project === project ? state.topology : null;
  return (
    <Section
      id="stacks"
      index="01"
      eyebrow="stacks"
      title="What is running"
      lead="One compose project at a time: health, restarts, CPU and memory, read with docker_get_stack_topology. Choose a container to look inside it."
    >
      <GlassPanel className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Tabs label="Compose projects" idPrefix="project" tabs={tabs} active={project} onChange={onProject} />
          <LiveControl live={live} onToggle={onToggleLive} />
        </div>
        <TabPanel idPrefix="project" active={project} className="mt-6">
          {state.problem && <Notice tone="crit" title="could not read this project" alert>{state.problem}</Notice>}
          {current && <ServiceGrid topology={current} selected={selected} onInspect={onInspect} />}
          {!current && !state.problem && <p className="font-mono text-sm text-ink-mute">Reading {project}…</p>}
        </TabPanel>
      </GlassPanel>
    </Section>
  );
}
