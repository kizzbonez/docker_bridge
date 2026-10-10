import type { ReactNode } from 'react';

interface SectionProps {
  id: string;
  /** Two-digit ordinal shown in the eyebrow, e.g. "02". */
  index: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}

/** A page section with the shared eyebrow / title / lead header. */
export function Section({ id, index, eyebrow, title, lead, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <header className="mb-8 max-w-3xl">
        <p className="eyebrow">
          <span className="text-ink-mute">{index} //</span> {eyebrow}
        </p>
        <h2 id={`${id}-title`} className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {lead && <p className="mt-3 text-base leading-relaxed text-ink-dim">{lead}</p>}
      </header>
      {children}
    </section>
  );
}
