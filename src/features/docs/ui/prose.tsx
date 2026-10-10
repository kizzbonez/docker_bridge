import type { ReactNode } from 'react';

interface ChildrenProps {
  children: ReactNode;
}

/** Body paragraph. */
export function P({ children }: ChildrenProps) {
  return <p className="leading-relaxed text-ink-dim">{children}</p>;
}

/** Inline code. */
export function C({ children }: ChildrenProps) {
  return (
    <code className="rounded bg-carbon-700/70 px-1.5 py-0.5 font-mono text-[0.85em] break-words text-cyan-300">{children}</code>
  );
}

/** Sub-heading inside a documentation section. */
export function H3({ children, id }: ChildrenProps & { id?: string }) {
  return (
    <h3 id={id} className="scroll-mt-24 pt-3 font-display text-xl font-semibold text-ink">
      {children}
    </h3>
  );
}

/** Bulleted list with the on-brand marker. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 text-ink-dim">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5 leading-relaxed">
          <span aria-hidden="true" className="text-sky-400">
            ▸
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
