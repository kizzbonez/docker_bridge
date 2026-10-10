import { useAction } from '@/features/auth/hooks/use-action';
import { authApi, type SessionInfo } from '@/features/auth/model/auth-api';
import { FormError } from '@/features/auth/ui/form-parts';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { describeAgent, formatTime } from '../model/describe';
import { Panel } from './panel';

interface RowProps {
  session: SessionInfo;
  onRevoke: (id: string) => void;
  busy: boolean;
}

function SessionRow({ session, onRevoke, busy }: RowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
          {describeAgent(session.userAgent)}
          {session.current && <Badge tone="ok">this device</Badge>}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-ink-mute">
          {session.ip} · last active {formatTime(session.lastSeenAt)}
        </p>
      </div>
      {!session.current && (
        <Button className="px-3 py-1.5 text-xs" disabled={busy} onClick={() => onRevoke(session.id)}>
          Revoke
        </Button>
      )}
    </li>
  );
}

interface SessionsPanelProps {
  sessions: SessionInfo[];
  onChanged: () => void;
}

/** Every signed-in device, with the power to end any of them. */
export function SessionsPanel({ sessions, onChanged }: SessionsPanelProps) {
  const revoke = useAction(async (id: string) => {
    await authApi.revokeSession(id);
    onChanged();
  });
  const revokeOthers = useAction(async () => {
    await authApi.revokeOthers();
    onChanged();
  });
  const others = sessions.filter((session) => !session.current).length;

  return (
    <Panel
      id="sessions"
      title="Active sessions"
      lead="Sessions end after 12 hours, or 2 hours without activity."
      action={
        <Button className="px-3 py-1.5 text-xs" disabled={others === 0 || revokeOthers.pending} onClick={() => void revokeOthers.run()}>
          Sign out other sessions
        </Button>
      }
    >
      <ul className="divide-y divide-cyan-500/10">
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} busy={revoke.pending} onRevoke={(id) => void revoke.run(id)} />
        ))}
      </ul>
      <FormError message={revoke.error ?? revokeOthers.error} />
    </Panel>
  );
}
