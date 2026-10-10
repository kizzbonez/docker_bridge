import { useEffect, useState } from 'react';
import { authApi, type AuthStatus } from '../model/auth-api';

export type StatusState = { phase: 'loading' } | { phase: 'ready'; status: AuthStatus } | { phase: 'unavailable' };

/**
 * Asks the auth service who, if anyone, is signed in. `unavailable` covers
 * both an outage and local development, where no auth service runs.
 */
export function useAuthStatus(): StatusState {
  const [state, setState] = useState<StatusState>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    authApi.status().then(
      (status) => !cancelled && setState({ phase: 'ready', status }),
      () => !cancelled && setState({ phase: 'unavailable' }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
