import { memo, type ReactNode } from 'react';
import { LinkButton } from '@/shared/ui/button';
import { Section } from '@/shared/ui/section';
import { REPO_PATH } from '../model/config-snippets';
import { ConfigCard } from './config-card';

const CODE = 'rounded bg-carbon-700/70 px-1.5 py-0.5 font-mono text-[0.85em] break-words text-cyan-300';

interface StepProps {
  n: number;
  title: string;
  children: ReactNode;
}

function Step({ n, title, children }: StepProps) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 font-mono text-sm text-cyan-300">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-dim">{children}</p>
      </div>
    </li>
  );
}

export const SetupSection = memo(function SetupSection() {
  return (
    <Section
      id="setup"
      index="06"
      eyebrow="One-click setup"
      title="Wire it into Claude Code"
      lead="The server runs straight from this repository with Node: nothing to build or install. Register it, restart the session, and the three tools show up under /mcp."
    >
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ol className="min-w-0 space-y-6">
          <Step n={1} title="Add the server">
            Clone this repository, then copy the block into <code className={CODE}>~/.claude.json</code>, replacing{' '}
            <code className={CODE}>{REPO_PATH}</code> with its location. It needs Node 22.18 or newer.
          </Step>
          <Step n={2} title="Decide how much it may do">
            Leave <code className={CODE}>READ_ONLY_MODE</code> on and every state-changing command is refused. Add{' '}
            <code className={CODE}>DOCKER_BRIDGE_PROJECTS</code> to limit it to the compose projects you name.
          </Step>
          <Step n={3} title="Ask a real question">
            Run <code className={CODE}>/mcp</code> to confirm the connection, then try: “orders return 502 since the
            last deploy — find out why.”
          </Step>
          <li>
            <LinkButton href="/docs/#quick-start" className="text-xs">
              Read the full setup guide →
            </LinkButton>
          </li>
        </ol>
        <ConfigCard />
      </div>
    </Section>
  );
});
