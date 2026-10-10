import { useCallback, useEffect } from 'react';
import { ArchitectureSection } from '@/features/architecture/ui/architecture-section';
import { useAuthStatus, type StatusState } from '@/features/auth/hooks/use-auth-status';
import { navigate } from '@/features/auth/model/navigation';
import { SiteFooter } from '@/features/footer/ui/site-footer';
import { Hero } from '@/features/hero/ui/hero';
import { SetupSection } from '@/features/setup/ui/setup-section';
import { useSimulator } from '@/features/simulator/hooks/use-simulator';
import { SimulatorSection } from '@/features/simulator/ui/simulator-section';
import { SHOWCASE_SECTIONS, StatusBar, VISITOR_LINKS, MEMBER_LINKS, type NavLink } from '@/features/status-bar/ui/status-bar';
import { LivePill, SystemStrip } from '@/features/status-bar/ui/system-status';
import { TokenEconomySection } from '@/features/token-economy/ui/token-economy-section';
import { ToolPlaygroundSection } from '@/features/tool-playground/ui/tool-playground-section';
import { Atmosphere } from '@/shared/ui/atmosphere';
import { SkipLink } from './skip-link';

/**
 * Who is looking at the showcase. It can be public, so it cannot assume a
 * session: a visitor gets no links into pages that would only bounce them to
 * sign-in. Without an auth service at all (local development) there is no
 * wall, so everyone is a member.
 */
type Audience = 'unknown' | 'visitor' | 'member';

function audienceOf(state: StatusState): Audience {
  if (state.phase === 'loading') return 'unknown';
  return state.phase === 'ready' && !state.status.authenticated ? 'visitor' : 'member';
}

const LINKS: Record<Audience, NavLink[]> = {
  unknown: SHOWCASE_SECTIONS,
  visitor: [...SHOWCASE_SECTIONS, ...VISITOR_LINKS],
  member: [...SHOWCASE_SECTIONS, ...MEMBER_LINKS],
};

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
  const state = useAuthStatus();
  const audience = audienceOf(state);
  // A brand-new install has no account yet. Whoever opens it first should be
  // claiming it, not looking at a demo.
  const setupRequired = state.phase === 'ready' && state.status.setupRequired;
  useEffect(() => {
    if (setupRequired) navigate('/setup/');
  }, [setupRequired]);

  return (
    <>
      <Atmosphere />
      <SkipLink />
      <StatusBar links={LINKS[audience]} strip={<SystemStrip />} pill={<LivePill />} />
      <main id="main">
        <LiveStage />
        <TokenEconomySection />
        <ToolPlaygroundSection />
        <ArchitectureSection />
        <SetupSection visitor={audience === 'visitor'} />
      </main>
      <SiteFooter visitor={audience !== 'member'} />
    </>
  );
}
