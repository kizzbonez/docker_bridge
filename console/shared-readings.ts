/** Asks `load` for a value, unless the same question was asked moments ago or is still being answered. */
export type SharedReadings<T> = (key: string, load: () => Promise<T>) => Promise<T>;

interface Entry<T> {
  at: number;
  value: Promise<T>;
}

/** More distinct questions than this at once means something is making keys up. */
const MAX_ENTRIES = 32;

/**
 * Shares one reading among everyone asking the same thing.
 *
 * A topology with metrics makes the engine sample every container's CPU,
 * which takes it a second or two. Every open console page asks for one every
 * few seconds; without sharing, a handful of tabs is enough to make the engine
 * stall. With it, a project is read at most once per `ttlMs`, however many
 * pages are watching.
 *
 * Only answers that `keep` accepts are remembered: a failure is never served
 * to the next caller.
 */
export function createSharedReadings<T>(ttlMs: number, keep: (value: T) => boolean, now: () => number = Date.now): SharedReadings<T> {
  const entries = new Map<string, Entry<T>>();
  const forget = (key: string, entry: Entry<T>): void => {
    if (entries.get(key) === entry) entries.delete(key);
  };

  return (key, load) => {
    const hit = entries.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.value;
    const oldest = entries.keys().next();
    if (entries.size >= MAX_ENTRIES && !oldest.done) entries.delete(oldest.value);

    const entry: Entry<T> = { at: now(), value: load() };
    entries.set(key, entry);
    entry.value.then(
      (value) => keep(value) || forget(key, entry),
      () => forget(key, entry),
    );
    return entry.value;
  };
}
