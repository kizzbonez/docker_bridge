import { Access } from '@/features/docs/content/access';
import { Configuration } from '@/features/docs/content/configuration';
import { Console } from '@/features/docs/content/console';
import { Guardrails } from '@/features/docs/content/guardrails';
import { LogPipeline } from '@/features/docs/content/log-pipeline';
import { Overview } from '@/features/docs/content/overview';
import { ProjectLayout } from '@/features/docs/content/project-layout';
import { QuickStart } from '@/features/docs/content/quick-start';
import { RunDashboard } from '@/features/docs/content/run-dashboard';
import { SecurityPosture } from '@/features/docs/content/security-posture';
import { ToolsReference } from '@/features/docs/content/tools-reference';
import { Tour } from '@/features/docs/content/tour';
import { Troubleshooting } from '@/features/docs/content/troubleshooting';
import { DocsHero } from '@/features/docs/ui/docs-hero';
import { DocsSidebar } from '@/features/docs/ui/docs-sidebar';
import { LiveStatusBar } from '@/features/console/ui/live-status-bar';
import { SiteFooter } from '@/features/footer/ui/site-footer';
import { DOCS_LINKS } from '@/features/status-bar/ui/status-bar';
import { Atmosphere } from '@/shared/ui/atmosphere';
import { SkipLink } from './skip-link';

/** The documentation page. Section order must match the table of contents. */
export function DocsApp() {
  return (
    <>
      <Atmosphere />
      <SkipLink />
      <LiveStatusBar links={DOCS_LINKS} />
      <main id="main">
        <DocsHero />
        <div className="mx-auto grid grid-cols-1 w-full max-w-7xl gap-x-12 px-4 pb-16 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <DocsSidebar />
          <article className="max-w-3xl min-w-0">
            <Overview />
            <QuickStart />
            <Configuration />
            <ToolsReference />
            <Guardrails />
            <LogPipeline />
            <Console />
            <Tour />
            <RunDashboard />
            <Access />
            <SecurityPosture />
            <ProjectLayout />
            <Troubleshooting />
          </article>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
