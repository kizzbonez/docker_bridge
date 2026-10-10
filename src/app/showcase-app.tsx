import { useCallback } from 'react';
import { ArchitectureSection } from '@/features/architecture/ui/architecture-section';
import { SiteFooter } from '@/features/footer/ui/site-footer';
import { Hero } from '@/features/hero/ui/hero';
import { SetupSection } from '@/features/setup/ui/setup-section';
import { useSimulator } from '@/features/simulator/hooks/use-simulator';
import { SimulatorSection } from '@/features/simulator/ui/simulator-section';
import { SHOWCASE_LINKS, StatusBar } from '@/features/status-bar/ui/status-bar';
import { LivePill, SystemStrip } from '@/features/status-bar/ui/system-status';
import { TokenEconomySection } from '@/features/token-economy/ui/token-economy-section';
import { ToolPlaygroundSection } from '@/features/tool-playground/ui/tool-playground-section';
import { Atmosphere } from '@/shared/ui/atmosphere';
import { SkipLink } from './skip-link';

/**
 * Owns the simulator, which re-renders on every streamed character. Keeping
 * it here, not in <ShowcaseApp>, stops the other sections re-rendering with it.
 */
function LiveStage() {
  const simulator = useSimulator();
  const { start } = simulator;
  const tryLive = useCallback(() => start('gateway-502'), [start]);
  return (
    <>
      <Hero onTryLive={tryLive} />
      <SimulatorSection simulator={simulator} />
    </>
  );
}

/** The showcase: a guided, simulated walkthrough of what the server does. */
export function ShowcaseApp() {
  return (
    <>
      <Atmosphere />
      <SkipLink />
      <StatusBar links={SHOWCASE_LINKS} strip={<SystemStrip />} pill={<LivePill />} />
      <main id="main">
        <LiveStage />
        <TokenEconomySection />
        <ToolPlaygroundSection />
        <ArchitectureSection />
        <SetupSection />
      </main>
      <SiteFooter />
    </>
  );
}
