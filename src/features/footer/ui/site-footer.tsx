import { BrandLockup } from '@/shared/ui/brand-lockup';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/docs/', label: 'Documentation' },
  { href: '/docs/#guardrails', label: 'Guardrails' },
  { href: '/docs/#tools-reference', label: 'Tool reference' },
  { href: '/account/', label: 'Account & security' },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-cyan-500/15 bg-carbon-950/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-8 px-4 py-10 sm:px-6">
        <div className="max-w-md">
          <BrandLockup />
          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            This page is a showcase. Containers, logs, metrics and tool responses are simulated in your browser; the
            dashboard never mounts or contacts a Docker socket.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 font-mono text-xs">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-ink-dim transition-colors hover:text-cyan-300">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
