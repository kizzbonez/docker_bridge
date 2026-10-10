import { useActivity, useEngine } from '@/features/console/hooks/use-console';
import { ActivitySection } from '@/features/console/ui/activity-section';
import { ConsoleHeader } from '@/features/console/ui/console-header';
import { EngineStage } from '@/features/console/ui/engine-stage';
import { EngineStatusBar } from '@/features/console/ui/live-status-bar';
import { SiteFooter } from '@/features/footer/ui/site-footer';
import { CONSOLE_LINKS } from '@/features/status-bar/ui/status-bar';
import { Atmosphere } from '@/shared/ui/atmosphere';
import { SkipLink } from './skip-link';

/**
 * The signed-in home page: the engine on this machine, read live. The page
 * polls the engine summary and the activity log once, and hands both to the
 * status bar and the sections.
 */
export function ConsoleApp() {
  const engine = useEngine();
  const activity = useActivity();
  return (
    <>
      <Atmosphere />
      <SkipLink />
      <EngineStatusBar links={CONSOLE_LINKS} engine={engine} />
      <main id="main">
        <ConsoleHeader engine={engine.data} activity={activity.data} />
        <EngineStage engine={engine} />
        <ActivitySection activity={activity} />
      </main>
      <SiteFooter />
    </>
  );
}
