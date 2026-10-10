import { useCallback, useEffect, useState } from 'react';
import { navigate } from '@/features/auth/model/navigation';
import { ConsoleApiError } from '../model/console-api';
import { describeProblem } from '../model/describe';

export interface Polled<T> {
  /** The latest answer; kept while a later refresh fails. Null until the first one arrives. */
  data: T | null;
  /** Why the latest refresh failed, or null. */
  error: string | null;
  /** When `data` arrived, as epoch milliseconds. */
  refreshedAt: number | null;
  refresh: () => void;
}

interface Snapshot<T> {
  /** The loader this answer came from, so an answer for an old question is never shown. */
  source: unknown;
  data: T | null;
  error: string | null;
  refreshedAt: number | null;
}

const EMPTY = { data: null, error: null, refreshedAt: null };

/** A dead session makes the whole page stale: go and sign in again. */
function leaveIfSignedOut(error: unknown): boolean {
  if (!(error instanceof ConsoleApiError) || error.status !== 401) return false;
  navigate(`/login/?next=${window.location.pathname}`);
  return true;
}

/**
 * Calls `load` now and then every `intervalMs` while the tab is visible; with
 * a null interval it loads once and waits to be refreshed. `load` must keep
 * its identity between renders; a new one starts over.
 */
export function usePolling<T>(load: () => Promise<T>, intervalMs: number | null, enabled = true): Polled<T> {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ source: load, ...EMPTY });
  const [nudge, setNudge] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const tick = (): void => {
      if (document.hidden) return;
      load().then(
        (data) => !cancelled && setSnapshot({ source: load, data, error: null, refreshedAt: Date.now() }),
        (error: unknown) => {
          if (cancelled || leaveIfSignedOut(error)) return;
          setSnapshot((current) => ({ ...(current.source === load ? current : EMPTY), source: load, error: describeProblem(error) }));
        },
      );
    };
    tick();
    const id = intervalMs === null ? null : window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      if (id !== null) window.clearInterval(id);
    };
  }, [load, intervalMs, enabled, nudge]);

  const refresh = useCallback(() => setNudge((value) => value + 1), []);
  const current = snapshot.source === load ? snapshot : EMPTY;
  return { data: current.data, error: current.error, refreshedAt: current.refreshedAt, refresh };
}
