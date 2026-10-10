import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabsProps<T extends string> {
  /** Accessible name of the tab list. */
  label: string;
  /** Prefix for tab / panel ids; must be unique on the page. */
  idPrefix: string;
  tabs: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
}

const TAB = 'rounded-md border px-3 py-1.5 font-mono text-xs transition-colors duration-200';
const TAB_ON = 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300';
const TAB_OFF = 'border-cyan-500/15 text-ink-dim hover:border-cyan-400/40 hover:text-ink';

/** WAI-ARIA tabs with arrow-key roving focus. Pair with <TabPanel>. */
export function Tabs<T extends string>({ label, idPrefix, tabs, active, onChange }: TabsProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.id === active);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (!next) return;
    onChange(next.id);
    document.getElementById(`${idPrefix}-tab-${next.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${idPrefix}-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={tab.id === active ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className={cx(TAB, tab.id === active ? TAB_ON : TAB_OFF)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface TabPanelProps {
  idPrefix: string;
  active: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ idPrefix, active, children, className }: TabPanelProps) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${active}`} className={className}>
      {children}
    </div>
  );
}
