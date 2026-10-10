import { Section } from '@/shared/ui/section';
import type { Simulator } from '../hooks/use-simulator';
import { AgentTerminal } from './agent-terminal';
import { ContainerMesh } from './container-mesh';

export function SimulatorSection({ simulator }: { simulator: Simulator }) {
  return (
    <Section
      id="simulator"
      index="02"
      eyebrow="Live simulation"
      title="Watch an agent debug a broken stack"
      lead="Trigger an incident. The agent maps the stack, pulls only the log lines that matter, and drafts a fix — while the mesh on the right reacts in real time. Everything here is simulated in your browser."
    >
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <AgentTerminal simulator={simulator} />
        <ContainerMesh mesh={simulator.mesh} />
      </div>
    </Section>
  );
}
