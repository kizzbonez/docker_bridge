import type { ReactNode } from 'react';
import { BridgeVisual } from '@/features/hero/ui/bridge-visual';
import { Atmosphere } from '@/shared/ui/atmosphere';
import { BrandLockup } from '@/shared/ui/brand-lockup';
import { GlassPanel } from '@/shared/ui/glass-panel';

const ASSURANCES = [
  { title: 'Two-factor by default', body: 'A password alone never opens the console.' },
  { title: 'Sessions you control', body: 'See every signed-in device and end any of them.' },
  { title: 'Nothing public', body: 'Every page, asset and document sits behind this door.' },
];

/** Left half of the portal card: brand, the bridge, and what protects the account. */
function PortalAside() {
  return (
    <aside className="hidden flex-col justify-between gap-8 border-r border-cyan-500/15 bg-carbon-950/40 p-10 lg:flex">
      <BrandLockup />
      <BridgeVisual />
      <ul className="space-y-3">
        {ASSURANCES.map((item) => (
          <li key={item.title} className="flex gap-3 text-sm">
            <span aria-hidden="true" className="text-emerald-400">
              ▸
            </span>
            <span>
              <span className="font-display font-semibold text-ink">{item.title}.</span>{' '}
              <span className="text-ink-dim">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

interface PortalShellProps {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
}

/** The frame shared by sign-in and first-time setup. */
export function PortalShell({ eyebrow, title, lead, children }: PortalShellProps) {
  return (
    <>
      <Atmosphere />
      <main id="main" className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
        <GlassPanel className="grid grid-cols-1 w-full lg:grid-cols-[0.9fr_1.1fr]">
          <PortalAside />
          <section aria-labelledby="portal-title" className="p-6 sm:p-10">
            <div className="mb-8 lg:hidden">
              <BrandLockup />
            </div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="portal-title" className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {lead && <p className="mt-2 text-sm leading-relaxed text-ink-dim">{lead}</p>}
            <div className="mt-6">{children}</div>
          </section>
        </GlassPanel>
      </main>
    </>
  );
}
