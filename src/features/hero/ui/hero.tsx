import { memo } from 'react';
import { MCP_CONFIG_JSON } from '@/features/setup/model/config-snippets';
import { LinkButton } from '@/shared/ui/button';
import { CopyButton } from '@/shared/ui/copy-button';
import { BridgeVisual } from './bridge-visual';
import { HeroStats } from './hero-stats';

interface HeroProps {
  /** Starts the first scenario; the link itself scrolls to the simulator. */
  onTryLive: () => void;
}

function HeroActions({ onTryLive }: HeroProps) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <LinkButton variant="primary" href="#simulator" onClick={onTryLive}>
        <span aria-hidden="true">▶</span> Try Live Simulation
      </LinkButton>
      <CopyButton text={MCP_CONFIG_JSON} label="Copy MCP Config" copiedLabel="Config copied" />
      <LinkButton href="#architecture">View Architecture</LinkButton>
    </div>
  );
}

export const Hero = memo(function Hero({ onTryLive }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid grid-cols-1 w-full max-w-7xl items-center gap-x-10 gap-y-10 px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20"
    >
      <div>
        <p className="eyebrow">
          <span className="text-ink-mute">01 //</span> Model Context Protocol server
        </p>
        <h1 id="hero-title" className="mt-4 font-display text-4xl leading-[1.05] font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Autonomous Container Diagnostics for <span className="text-sky-400">Agentic Workflows</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-dim">
          Token-efficient, safety-guarded Docker Engine debugging built specifically for Claude Code.
        </p>
        <HeroActions onTryLive={onTryLive} />
      </div>
      <BridgeVisual />
      <HeroStats />
    </section>
  );
});
