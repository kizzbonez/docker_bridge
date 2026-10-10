import type { ReactNode } from 'react';
import type { AccountOverview } from '@/features/auth/model/auth-api';
import { Badge } from '@/shared/ui/badge';
import { formatTime } from '../model/describe';
import { Panel } from './panel';

const LOW_RECOVERY_CODES = 3;

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] tracking-wider text-ink-mute uppercase">{term}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Who is signed in and how the account is protected. */
export function SummaryPanel({ account }: { account: AccountOverview }) {
  const low = account.recoveryCodesLeft <= LOW_RECOVERY_CODES;
  return (
    <Panel id="summary" title="Administrator" className="lg:col-span-2">
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact term="Username">
          <span className="font-mono">{account.user}</span>
        </Fact>
        <Fact term="Two-factor">
          <Badge tone="ok">Authenticator app · on</Badge>
        </Fact>
        <Fact term="Password changed">{formatTime(account.passwordChangedAt)}</Fact>
        <Fact term="Recovery codes">
          <Badge tone={low ? 'warn' : 'signal'}>{account.recoveryCodesLeft} of 10 left</Badge>
        </Fact>
      </dl>
    </Panel>
  );
}
