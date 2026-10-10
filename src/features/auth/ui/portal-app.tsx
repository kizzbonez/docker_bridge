import { useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { useAuthStatus, type StatusState } from '../hooks/use-auth-status';
import { navigate, nextDestination } from '../model/navigation';
import { LoginView } from './login-view';
import { PortalShell } from './portal-shell';
import { SetupWizard } from './setup-wizard';

type View = 'unavailable' | 'connecting' | 'redirecting' | 'setup' | 'login';

function viewOf(state: StatusState): View {
  if (state.phase === 'unavailable') return 'unavailable';
  if (state.phase === 'loading') return 'connecting';
  if (state.status.authenticated) return 'redirecting';
  return state.status.setupRequired ? 'setup' : 'login';
}

/** Keeps the address bar honest: /setup/ during onboarding, /login/ otherwise. */
const CANONICAL_PATH: Partial<Record<View, string>> = { setup: '/setup/', login: '/login/' };

function Unavailable() {
  return (
    <PortalShell
      eyebrow="auth // offline"
      title="Sign-in is unavailable"
      lead="The authentication service did not answer. Nothing is served until it is back."
    >
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </PortalShell>
  );
}

/**
 * The public entry point. Asks the auth service what state the install is in
 * and shows onboarding, sign-in, or sends an already signed-in visitor on.
 */
export function PortalApp() {
  const view = viewOf(useAuthStatus());

  useEffect(() => {
    const path = CANONICAL_PATH[view];
    if (view === 'redirecting') navigate(nextDestination());
    else if (path && window.location.pathname !== path) window.history.replaceState(null, '', path + window.location.search);
  }, [view]);

  if (view === 'unavailable') return <Unavailable />;
  if (view === 'setup') return <SetupWizard />;
  if (view === 'login') return <LoginView />;
  return <PortalShell eyebrow="auth // connecting" title="One moment…" />;
}
