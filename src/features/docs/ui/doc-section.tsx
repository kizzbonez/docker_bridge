import type { ReactNode } from 'react';
import { titleOf } from '../model/toc';

interface DocSectionProps {
  /** Must be an id from the table of contents. */
  id: string;
  lead?: ReactNode;
  children: ReactNode;
}

/** One documentation section with a linkable heading. */
export function DocSection({ id, lead, children }: DocSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 border-t border-cyan-500/10 py-12 first:border-t-0 first:pt-2">
      <h2 id={`${id}-heading`} className="group font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        <a href={`#${id}`} className="hover:text-cyan-300">
          {titleOf(id)}
          <span aria-hidden="true" className="ml-2 text-cyan-500 opacity-0 transition-opacity group-hover:opacity-100">
            #
          </span>
        </a>
      </h2>
      {lead && <p className="mt-3 text-lg leading-relaxed text-ink-dim">{lead}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}
