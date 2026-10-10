import { cx } from '@/shared/lib/cx';
import { useScrollSpy } from '../hooks/use-scroll-spy';
import { TOC, TOC_GROUPS, TOC_IDS, type TocGroup } from '../model/toc';

const LINK = 'block rounded-md px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors';
const LINK_ON = 'bg-cyan-500/15 text-cyan-300';
const LINK_OFF = 'text-ink-dim hover:bg-white/5 hover:text-ink';

function Group({ group, active }: { group: TocGroup; active: string }) {
  return (
    <li className="flex items-center gap-1 lg:mb-6 lg:block">
      <p className="eyebrow mb-2 hidden px-3 lg:block">{group}</p>
      <ul className="flex gap-1 lg:block lg:space-y-0.5">
        {TOC.filter((entry) => entry.group === group).map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={entry.id === active ? 'location' : undefined}
              className={cx(LINK, entry.id === active ? LINK_ON : LINK_OFF)}
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </li>
  );
}

/**
 * Section navigation with scroll-spy. A sticky column on desktop; a single
 * horizontally scrolling row on small screens.
 */
export function DocsSidebar() {
  const active = useScrollSpy(TOC_IDS);
  return (
    <nav aria-label="Documentation sections" className="mb-8 min-w-0 lg:sticky lg:top-20 lg:mb-0 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:block lg:overflow-visible lg:pb-0">
        {TOC_GROUPS.map((group) => (
          <Group key={group} group={group} active={active} />
        ))}
      </ul>
    </nav>
  );
}
