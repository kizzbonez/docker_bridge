import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { H3, P } from '../ui/prose';

const STAGES = [
  { name: 'tail', body: 'Read only the last tail_lines lines.' },
  { name: 'sanitize', body: 'Strip ANSI colour and cursor codes.' },
  { name: 'match', body: 'Keep lines that match filter_pattern.' },
  { name: 'dedupe', body: 'Collapse lines that differ only in numbers into one event with a repeat count.' },
  { name: 'budget', body: 'Stop before the next line would exceed token_budget.' },
];

const FIELDS: string[][] = [
  ['scanned_lines', 'Lines read from the end of the log.'],
  ['matched_lines', 'Lines that matched the pattern, before deduplication.'],
  ['returned_lines', 'Distinct events returned after deduplication and budgeting.'],
  ['truncated', 'true when the budget cut the result short. Raise token_budget or narrow the pattern.'],
  ['tokens.raw_tail', 'Estimated cost of the unfiltered tail, i.e. what plain docker logs would have spent.'],
  ['tokens.returned', 'Estimated cost of the log text actually returned.'],
  ['lines[].repeats', 'How many matched lines were folded into this event.'],
];

function Pipeline() {
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5" data-testid="pipeline">
      {STAGES.map((stage, index) => (
        <li key={stage.name} className="rounded-xl border border-cyan-500/20 bg-carbon-800/40 p-3">
          <p className="font-mono text-[11px] text-ink-mute">stage {index + 1}</p>
          <p className="font-mono text-sm text-cyan-300">{stage.name}</p>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-dim">{stage.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function LogPipeline() {
  return (
    <DocSection
      id="log-pipeline"
      lead="docker_tail_filtered_logs is where the token savings come from. A log passes through five stages before a single line reaches the model."
    >
      <Pipeline />
      <P>
        Deduplication is what turns a retry storm into one line: a thousand “connection refused” entries that differ
        only by timestamp and request id come back as a single event with <code className="font-mono text-cyan-300">repeats: 1000</code>.
      </P>
      <H3>Response fields</H3>
      <DataTable caption="docker_tail_filtered_logs response fields" columns={['Field', 'Meaning']} rows={FIELDS} />
      <P>
        Token figures are estimates at roughly four characters per token. They are for comparing payload sizes, not
        for billing.
      </P>
    </DocSection>
  );
}
