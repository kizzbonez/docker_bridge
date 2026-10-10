import { REPO_HOME } from '@/features/setup/model/config-snippets';
import { BrandLockup } from '@/shared/ui/brand-lockup';

interface FooterLink {
  href: string;
  label: string;
  /** Leaves the site: opens in a new tab, so it also works when the site is shown in a frame. */
  external?: boolean;
}

const MEMBER_LINKS: FooterLink[] = [
  { href: '/', label: 'Console' },
  { href: '/showcase/', label: 'Showcase' },
  { href: '/docs/', label: 'Documentation' },
  { href: '/docs/#guardrails', label: 'Guardrails' },
  { href: '/docs/#tools-reference', label: 'Tool reference' },
  { href: '/account/', label: 'Account & security' },
];

/** For someone without a session: nothing here leads to a page that would only ask them to sign in. */
const VISITOR_LINKS: FooterLink[] = [
  { href: `${REPO_HOME}#readme`, label: 'Documentation on GitHub', external: true },
  { href: REPO_HOME, label: 'Source code', external: true },
  { href: '/login/', label: 'Sign in' },
];

const LINK = 'text-ink-dim transition-colors hover:text-cyan-300';

function FooterAnchor({ link }: { link: FooterLink }) {
  if (!link.external) {
    return (
      <a href={link.href} className={LINK}>
        {link.label}
      </a>
    );
  }
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {link.label}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SiteFooter({ visitor = false }: { visitor?: boolean }) {
  return (
    <footer className="mt-10 border-t border-cyan-500/15 bg-carbon-950/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-8 px-4 py-10 sm:px-6">
        <div className="max-w-md">
          <BrandLockup />
          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            An MCP server that lets an agent debug containers, with a live console for the engine on this machine.
            The console is real. The showcase is a simulation: its containers, logs and tool responses are made up
            in your browser.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 font-mono text-xs">
            {(visitor ? VISITOR_LINKS : MEMBER_LINKS).map((link) => (
              <li key={link.href}>
                <FooterAnchor link={link} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
