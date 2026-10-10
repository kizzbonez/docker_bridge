import { memo } from 'react';
import { Section } from '@/shared/ui/section';
import { GUARDRAILS } from '../model/guardrails';
import { ArchitectureFlow } from './architecture-flow';

function GuardrailGrid() {
  return (
    <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {GUARDRAILS.map((guardrail, index) => (
        <li key={guardrail.title} className="rounded-xl border border-cyan-500/15 bg-carbon-800/40 p-4">
          <p className="font-mono text-xs text-emerald-400">G{index + 1}</p>
          <h3 className="mt-1 font-display text-base font-semibold text-ink">{guardrail.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">{guardrail.body}</p>
        </li>
      ))}
    </ul>
  );
}

export const ArchitectureSection = memo(function ArchitectureSection() {
  return (
    <Section
      id="architecture"
      index="05"
      eyebrow="Architecture"
      title="One narrow bridge between the model and the daemon"
      lead="The agent never touches the Docker socket. It speaks JSON-RPC to the bridge over stdio; the bridge decides what reaches the engine and how much comes back."
    >
      <ArchitectureFlow />
      <GuardrailGrid />
    </Section>
  );
});
