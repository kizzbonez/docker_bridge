import type { ActivityEvent } from '@/features/auth/model/auth-api';
import { Badge } from '@/shared/ui/badge';
import { describeEvent, formatTime } from '../model/describe';
import { Panel } from './panel';

/** The most recent security events, newest first. */
export function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  return (
    <Panel
      id="activity"
      title="Recent activity"
      lead="Sign-ins, failures and changes since the service last started. The full trail is in the container log."
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Recent security activity">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="font-mono text-[11px] tracking-wider text-sky-300 uppercase">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">When</th>
              <th scope="col" className="py-2 pr-4 font-medium">Event</th>
              <th scope="col" className="py-2 pr-4 font-medium">Address</th>
              <th scope="col" className="py-2 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-500/10">
            {events.map((event, index) => {
              const { label, tone } = describeEvent(event.type);
              return (
                <tr key={`${event.at}-${index}`}>
                  <td className="py-2 pr-4 whitespace-nowrap text-ink-dim">{formatTime(event.at)}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                  <td className="py-2 pr-4 font-mono text-[12px] text-ink-dim">{event.ip}</td>
                  <td className="py-2 font-mono text-[12px] break-all text-ink-mute">{event.detail || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
