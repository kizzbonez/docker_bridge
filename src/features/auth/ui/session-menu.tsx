import { useAction } from '../hooks/use-action';
import { useAuthStatus } from '../hooks/use-auth-status';
import { authApi } from '../model/auth-api';
import { navigate } from '../model/navigation';

const ITEM = 'rounded-md px-2.5 py-1.5 font-mono text-xs transition-colors hover:bg-white/5';

/**
 * Who is signed in, a link to the account page, and sign-out. Renders nothing
 * when there is no session to show (including local development without the
 * auth service).
 */
export function SessionMenu() {
  const state = useAuthStatus();
  const signOut = useAction(async () => {
    await authApi.logout();
    navigate('/login/');
  });
  if (state.phase !== 'ready' || !state.status.authenticated) return null;

  return (
    <div className="flex items-center gap-1 border-l border-cyan-500/15 pl-3" data-testid="session-menu">
      <a href="/account/" className={`${ITEM} hidden text-emerald-400 hover:text-emerald-400 sm:block`} aria-label={`Account and security for ${state.status.user}`}>
        <span aria-hidden="true">● </span>
        {state.status.user}
      </a>
      <button type="button" className={`${ITEM} text-ink-dim hover:text-cyan-300`} disabled={signOut.pending} onClick={() => void signOut.run()}>
        Sign out
      </button>
    </div>
  );
}
