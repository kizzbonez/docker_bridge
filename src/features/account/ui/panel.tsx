import type { ReactNode } from 'react';
import { GlassPanel } from '@/shared/ui/glass-panel';

interface PanelProps {
  id: string;
  title: string;
  lead?: ReactNode;
  /** Right-aligned control in the header. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled card on the account page. */
export function Panel({ id, title, lead, action, children, className }: PanelProps) {
  return (
    <GlassPanel className={className}>
      <section aria-labelledby={`${id}-title`} data-testid={`panel-${id}`} className="p-5 sm:p-6">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-title`} className="font-display text-xl font-semibold text-ink">
              {title}
            </h2>
            {lead && <p className="mt-1 text-sm leading-relaxed text-ink-dim">{lead}</p>}
          </div>
          {action}
        </header>
        {children}
      </section>
    </GlassPanel>
  );
}
