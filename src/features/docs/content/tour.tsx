import { DocSection } from '../ui/doc-section';

interface Shot {
  file: string;
  title: string;
  caption: string;
}

/** Captured by `npm run screenshots` into public/screenshots (1440 × 900). */
const SHOTS: Shot[] = [
  {
    file: 'onboarding.png',
    title: 'First-run onboarding',
    caption: 'A new install opens on the setup wizard: token, administrator account, authenticator app, recovery codes.',
  },
  {
    file: 'console-overview.png',
    title: 'Console: the engine at a glance',
    caption: 'The signed-in home page. Engine status in the bar, then four numbers read from the engine and the activity log.',
  },
  {
    file: 'console-stacks.png',
    title: 'Console: what is running',
    caption: 'Every compose project with health, restarts, CPU and memory per service, refreshed every few seconds.',
  },
  {
    file: 'console-inspect.png',
    title: 'Console: inside a container',
    caption: 'A filtered log tail of a real container, with the token count the filter saved, and guarded exec one tab away.',
  },
  {
    file: 'console-activity.png',
    title: 'Console: agent activity',
    caption: 'Every tool call an MCP client made, by client name, with its outcome, duration and tokens.',
  },
  {
    file: 'dashboard-hero.png',
    title: 'Showcase: status bar and hero',
    caption: 'The simulated walkthrough opens with the value proposition and counters that animate into view.',
  },
  {
    file: 'simulator-redis-oom.png',
    title: 'Showcase: Redis OOM',
    caption: 'cache-redis turns red with ExitCode 137 (OOMKilled) while the agent narrows down the cause on the left.',
  },
  {
    file: 'token-economy.png',
    title: 'Showcase: token and context economy',
    caption: 'Drag the divider between raw docker logs and the filtered result; the cards recompute cost and context pressure.',
  },
  {
    file: 'tool-playground.png',
    title: 'Showcase: guardrails in the playground',
    caption: 'A destructive command is refused before it reaches the container, with the reason in the response.',
  },
  {
    file: 'account-security.png',
    title: 'Account and security',
    caption: 'Every signed-in device, password and recovery-code rotation, and the recent security activity.',
  },
];

function Figure({ shot }: { shot: Shot }) {
  const src = `/screenshots/${shot.file}`;
  return (
    <figure className="overflow-hidden rounded-xl border border-cyan-500/20 bg-carbon-950/60">
      <a href={src} target="_blank" rel="noreferrer" aria-label={`Open full-size screenshot: ${shot.title}`}>
        <img src={src} alt={`Screenshot: ${shot.title}`} width={1440} height={900} loading="lazy" decoding="async" className="h-auto w-full" />
      </a>
      <figcaption className="border-t border-cyan-500/15 px-4 py-3">
        <p className="font-display text-base font-semibold text-ink">{shot.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-dim">{shot.caption}</p>
      </figcaption>
    </figure>
  );
}

export function Tour() {
  return (
    <DocSection id="tour" lead="What each part of the site shows. Select an image to open it full size.">
      <div className="grid grid-cols-1 gap-5" data-testid="tour">
        {SHOTS.map((shot) => (
          <Figure key={shot.file} shot={shot} />
        ))}
      </div>
    </DocSection>
  );
}
