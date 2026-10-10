import { SessionMenu } from '@/features/auth/ui/session-menu';
import { cx } from '@/shared/lib/cx';
import { BrandLockup } from '@/shared/ui/brand-lockup';
import { LivePill, SystemStrip } from './system-status';

export interface NavLink {
  href: string;
  label: string;
  /** Stays visible on small screens, where the other links are hidden. */
  always?: boolean;
}

export const DASHBOARD_LINKS: NavLink[] = [
  { href: '#simulator', label: 'Simulator' },
  { href: '#economy', label: 'Economy' },
  { href: '#tools', label: 'Tools' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#setup', label: 'Setup' },
  { href: '/docs/', label: 'Docs', always: true },
];

export const DOCS_LINKS: NavLink[] = [
  { href: '/#simulator', label: 'Simulator' },
  { href: '/#tools', label: 'Playground' },
  { href: '/', label: 'Dashboard', always: true },
];

const LINK = 'rounded-md px-2.5 py-1.5 text-ink-dim transition-colors hover:bg-white/5 hover:text-cyan-300';

/**
 * Two tiers: the system strip scrolls away with the page; the brand and
 * navigation row sticks, carrying a compact live indicator.
 */
export function StatusBar({ links }: { links: NavLink[] }) {
  return (
    <>
      <SystemStrip />
      <header className="sticky top-0 z-40 border-b border-cyan-500/15 bg-carbon-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <a href="/" aria-label="DockerBridge MCP home">
            <BrandLockup />
          </a>
          <LivePill />
          <nav aria-label="Primary" className="ml-auto">
            <ul className="flex items-center gap-x-1 font-mono text-xs">
              {links.map((link) => (
                <li key={link.href} className={cx(!link.always && 'hidden md:block')}>
                  <a href={link.href} className={LINK}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <SessionMenu />
        </div>
      </header>
    </>
  );
}
