import type { ActivityRecord } from '@bridge/core/activity-types';
import { formatInt } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { ago, describeOutcome } from '../model/describe';

const HEAD = 'py-2 pr-4 font-medium';
const CELL = 'py-2 pr-4 align-top';

const tokens = (record: ActivityRecord): string =>
  record.tokens.raw === null ? formatInt(record.tokens.returned) : `${formatInt(record.tokens.raw)} → ${formatInt(record.tokens.returned)}`;

function Row({ record, now }: { record: ActivityRecord; now: number }) {
  const { label, tone } = describeOutcome(record.outcome);
  return (
    <tr>
      <td className={`${CELL} whitespace-nowrap text-ink-dim`}>
        <time dateTime={record.at}>{ago(record.at, now)}</time>
      </td>
      <td className={`${CELL} font-mono text-[12px] whitespace-nowrap text-ink`}>{record.client}</td>
      <td className={`${CELL} font-mono text-[12px] text-sky-300`}>{record.tool.replace(/^docker_/, '')}</td>
      <td className={`${CELL} font-mono text-[12px] break-all text-ink-dim`}>{record.target || '—'}</td>
      <td className={`${CELL} max-w-xs font-mono text-[12px] break-all text-ink-mute`}>{record.detail || '—'}</td>
      <td className={CELL}>
        <Badge tone={tone}>{label}</Badge>
      </td>
      <td className={`${CELL} text-right font-mono text-[12px] whitespace-nowrap text-ink-dim tabular-nums`}>{formatInt(record.ms)} ms</td>
      <td className="py-2 text-right align-top font-mono text-[12px] whitespace-nowrap text-ink-dim tabular-nums">{tokens(record)}</td>
    </tr>
  );
}

interface ActivityTableProps {
  calls: ActivityRecord[];
  /** The moment the list was fetched, so "ago" is measured from then. */
  now: number;
}

/** The most recent tool calls, newest first. */
export function ActivityTable({ calls, now }: ActivityTableProps) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Recent tool calls">
      <table data-testid="activity-table" className="w-full min-w-[52rem] text-left text-sm">
        <thead className="font-mono text-[11px] tracking-wider text-sky-300 uppercase">
          <tr>
            <th scope="col" className={HEAD}>When</th>
            <th scope="col" className={HEAD}>Client</th>
            <th scope="col" className={HEAD}>Tool</th>
            <th scope="col" className={HEAD}>Target</th>
            <th scope="col" className={HEAD}>Command or filter</th>
            <th scope="col" className={HEAD}>Outcome</th>
            <th scope="col" className={`${HEAD} text-right`}>Took</th>
            <th scope="col" className="py-2 text-right font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cyan-500/10">
          {calls.map((record, index) => (
            <Row key={`${record.at}-${index}`} record={record} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
