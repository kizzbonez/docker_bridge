import { formatInt } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { GlassPanel } from '@/shared/ui/glass-panel';
import { Section } from '@/shared/ui/section';
import type { Polled } from '../hooks/use-polling';
import type { ActivityView } from '../model/console-api';
import { ActivityTable } from './activity-table';
import { Notice } from './notice';

function Totals({ view }: { view: ActivityView }) {
  const { totals } = view;
  return (
    <p data-testid="activity-totals" className="mb-4 flex flex-wrap gap-2">
      <Badge tone="signal">{formatInt(totals.calls)} calls</Badge>
      <Badge tone={totals.refused > 0 ? 'warn' : 'mute'}>{formatInt(totals.refused)} refused</Badge>
      <Badge tone={totals.failed > 0 ? 'crit' : 'mute'}>{formatInt(totals.failed)} failed</Badge>
      <Badge tone="ok">≈ {formatInt(totals.tokens.saved)} tokens saved</Badge>
      {totals.clients.map((client) => (
        <Badge key={client} tone="mute">
          {client}
        </Badge>
      ))}
    </p>
  );
}

function Empty() {
  return (
    <Notice tone="signal" title="no tool call on record yet">
      Connect an MCP client to the bridge and ask it about a container: its calls appear here within a few seconds. The{' '}
      <a href="/docs/#quick-start" className="text-cyan-300 underline underline-offset-4 hover:text-cyan-400">
        setup guide
      </a>{' '}
      has the steps, starting with cloning the repository.
    </Notice>
  );
}

function Body({ activity }: { activity: Polled<ActivityView> }) {
  const { data, error, refreshedAt } = activity;
  if (data === null) {
    return error ? <Notice tone="crit" title="the activity log could not be read" alert>{error}</Notice> : <p className="font-mono text-sm text-ink-mute">Reading the activity log…</p>;
  }
  if (data.calls.length === 0) return <Empty />;
  return (
    <>
      <Totals view={data} />
      <ActivityTable calls={data.calls} now={refreshedAt ?? 0} />
    </>
  );
}

/** Who called which tool, and how it went: agents through the MCP server, and this page. */
export function ActivitySection({ activity }: { activity: Polled<ActivityView> }) {
  return (
    <Section
      id="activity"
      index="03"
      eyebrow="agent activity"
      title="What was asked of the bridge"
      lead="Every call an MCP client made through the server, and every log or command run from this page. It records who asked for what and how it went; what a tool returned is never kept."
    >
      <GlassPanel className="p-4 sm:p-6">
        <Body activity={activity} />
      </GlassPanel>
    </Section>
  );
}
