export interface Guardrail {
  title: string;
  body: string;
}

/** The four safety properties, shared by the dashboard and the docs. */
export const GUARDRAILS: Guardrail[] = [
  {
    title: 'Read-only by default',
    body: 'READ_ONLY_MODE gates every command that changes runtime state. Turn it off deliberately, per project.',
  },
  {
    title: 'No shell, ever',
    body: 'Commands are spawned as argv. Pipes, redirects, substitutions and chaining are rejected before anything runs.',
  },
  {
    title: 'Deadlines',
    body: 'Every exec carries a deadline. A command that overruns is cut off and reported, never awaited.',
  },
  {
    title: 'Budgeted output',
    body: 'Each response stops at a token budget, with repeats collapsed. A noisy container cannot flood the context.',
  },
];
