import { useCallback, useEffect, useState } from 'react';
import { AuthApiError, authApi, type AccountOverview } from '@/features/auth/model/auth-api';
import { navigate } from '@/features/auth/model/navigation';

export type AccountState = { phase: 'loading' } | { phase: 'ready'; account: AccountOverview } | { phase: 'error' };

interface UseAccount {
  state: AccountState;
  /** Re-fetches after a change, so lists and counters stay truthful. */
  reload: () => void;
}

/** Loads the signed-in administrator's security overview. */
export function useAccount(): UseAccount {
  const [state, setState] = useState<AccountState>({ phase: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authApi.account().then(
      (account) => !cancelled && setState({ phase: 'ready', account }),
      (error: unknown) => {
        if (cancelled) return;
        // A dead session means the whole page is stale: go and sign in again.
        if (error instanceof AuthApiError && error.status === 401) navigate('/login/?next=/account/');
        else setState({ phase: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { state, reload };
}
