import { useAccount } from '@/features/account/hooks/use-account';
import { ActivityPanel } from '@/features/account/ui/activity-panel';
import { PasswordPanel } from '@/features/account/ui/password-panel';
import { RecoveryPanel } from '@/features/account/ui/recovery-panel';
import { SessionsPanel } from '@/features/account/ui/sessions-panel';
import { SummaryPanel } from '@/features/account/ui/summary-panel';
import { SiteFooter } from '@/features/footer/ui/site-footer';
import { DOCS_LINKS, StatusBar } from '@/features/status-bar/ui/status-bar';
import { Atmosphere } from '@/shared/ui/atmosphere';
import { SkipLink } from './skip-link';

function Panels() {
  const { state, reload } = useAccount();
  if (state.phase === 'loading') return <p className="font-mono text-sm text-ink-mute">Loading account…</p>;
  if (state.phase === 'error') {
    return (
      <p role="alert" className="text-sm text-red-400">
        The account service did not answer. Reload the page to try again.
      </p>
    );
  }
  const { account } = state;
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <SummaryPanel account={account} />
      <SessionsPanel sessions={account.sessions} onChanged={reload} />
      <RecoveryPanel onChanged={reload} />
      <PasswordPanel username={account.user} onChanged={reload} />
      <ActivityPanel events={account.events} />
    </div>
  );
}

/** Account and security: sessions, password, recovery codes, activity. */
export function AccountApp() {
  return (
    <>
      <Atmosphere />
      <SkipLink />
      <StatusBar links={DOCS_LINKS} />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6">
        <header className="mb-8 max-w-3xl">
          <p className="eyebrow">
            <span className="text-ink-mute">account //</span> security
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Account &amp; security</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-dim">
            Review who is signed in, rotate your credentials, and see what has happened to this account.
          </p>
        </header>
        <Panels />
      </main>
      <SiteFooter />
    </>
  );
}
