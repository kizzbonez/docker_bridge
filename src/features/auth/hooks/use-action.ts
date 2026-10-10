import { useCallback, useState } from 'react';
import { describeError } from '../model/error-text';

interface Action<Args extends unknown[]> {
  run: (...args: Args) => Promise<void>;
  pending: boolean;
  /** A message ready to show the user, or null. */
  error: string | null;
}

/** Wraps a submit handler with the pending and error state every form needs. */
export function useAction<Args extends unknown[]>(action: (...args: Args) => Promise<void>): Action<Args> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<void> => {
      setPending(true);
      setError(null);
      try {
        await action(...args);
      } catch (caught) {
        setError(describeError(caught));
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, error };
}
