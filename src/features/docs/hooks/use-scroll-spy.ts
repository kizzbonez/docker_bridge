import { useEffect, useState } from 'react';

// A section counts as "in view" while it overlaps a band near the top of the viewport.
const ROOT_MARGIN = '-15% 0px -70% 0px';

/** The last section, in document order, that currently overlaps the reading band. */
export function pickActive(ids: string[], inBand: ReadonlySet<string>): string | undefined {
  return ids.findLast((id) => inBand.has(id));
}

/** Id of the section currently being read. `ids` must be a stable array. */
export function useScrollSpy(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        // Two sections can share the band at a boundary; the later one wins.
        const next = pickActive(ids, inBand);
        if (next) setActive(next);
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const id of ids) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
