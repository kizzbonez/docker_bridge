import type { ReactNode } from 'react';
import { SessionMenu } from '@/features/auth/ui/session-menu';
import { cx } from '@/shared/lib/cx';
import { BrandLockup } from '@/shared/ui/brand-lockup';

export interface NavLink {
  href: string;
  label: string;
  /** Stays visible on small screens, where the other links are hidden. */
  always?: boolean;
}

/** The live console: the signed-in home page. */
export const CONSOLE_LINKS: NavLink[] = [
  { href: '#stacks', label: 'Stacks' },
  { href: '#inspect', label: 'Inspect' },
  { href: '#activity', label: 'Activity' },
  { href: '/showcase/', label: 'Showcase' },
  { href: '/docs/', label: 'Docs', always: true },
];

/** The showcase's own sections: all anyone needs to find their way around it. */
export const SHOWCASE_SECTIONS: NavLink[] = [
  { href: '#simulator', label: 'Simulator' },
  { href: '#economy', label: 'Economy' },
  { href: '#tools', label: 'Tools' },
  { href: '#setup', label: 'Setup' },
];

/** Added on the showcase for someone signed in: the pages behind the wall. */
export const MEMBER_LINKS: NavLink[] = [
  { href: '/docs/', label: 'Docs' },
  { href: '/', label: 'Console', always: true },
];

/** Added on the showcase for someone without a session: the one page they can go to. */
export const VISITOR_LINKS: NavLink[] = [{ href: '/login/', label: 'Sign in', always: true }];

/** Documentation and account pages. */
export const DOCS_LINKS: NavLink[] = [
  { href: '/showcase/', label: 'Showcase' },
  { href: '/docs/', label: 'Docs' },
  { href: '/', label: 'Console', always: true },
];

const LINK = 'rounded-md px-2.5 py-1.5 text-ink-dim transition-colors hover:bg-white/5 hover:text-cyan-300';

interface StatusBarProps {
  links: NavLink[];
  /** The full readout shown once at the very top of the page; it scrolls away. */
  strip: ReactNode;
  /** The compact indicator that stays in the sticky bar (desktop only). */
  pill: ReactNode;
}

/**
 * Two tiers: the status strip scrolls away with the page; the brand and
 * navigation row sticks, carrying a compact indicator. What they report is up
 * to the page: the live engine, or the showcase's simulated server.
 */
export function StatusBar({ links, strip, pill }: StatusBarProps) {
  return (
    <>
      {strip}
      <header className="sticky top-0 z-40 border-b border-cyan-500/15 bg-carbon-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <a href="/" aria-label="DockerBridge MCP home">
            <BrandLockup />
          </a>
          {/* The wrapper carries the breakpoint: a Badge sets its own display, which would win over `hidden`. */}
          <span className="hidden lg:block">{pill}</span>
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
