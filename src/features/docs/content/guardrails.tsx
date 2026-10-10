import { GUARDRAILS } from '@/features/architecture/model/guardrails';
import { ALLOWED_BINARIES, EXEC_RULES, MAX_COMMAND_LENGTH } from '@bridge/core/exec-policy';
import { MAX_PATTERN_LENGTH } from '@bridge/core/filter-pattern';
import { Badge } from '@/shared/ui/badge';
import { Callout } from '../ui/callout';
import { DataTable } from '../ui/data-table';
import { DocSection } from '../ui/doc-section';
import { Bullets, C, H3, P } from '../ui/prose';

const RULE_ROWS = EXEC_RULES.map((rule) => [
  rule.example,
  <Badge key="verdict" tone={rule.verdict === 'deny' ? 'crit' : 'warn'}>
    {rule.verdict === 'deny' ? 'always refused' : 'needs READ_ONLY_MODE=false'}
  </Badge>,
  rule.reason,
]);

const ORDER = [
  <>The command must be non-empty and at most {MAX_COMMAND_LENGTH} characters.</>,
  <>It must contain no shell metacharacters: no pipes, redirects, substitutions or chaining.</>,
  <>Its first word must be on the binary allowlist.</>,
  <>The remaining deny rules run in order. The first match refuses the command outright.</>,
  <>
    A state-changing command passes only when <C>READ_ONLY_MODE</C> is <C>"false"</C>.
  </>,
  <>
    Whatever survives runs as argv for at most <C>timeout_ms</C>. On an overrun the bridge closes the stream and reports{' '}
    <C>timed_out</C>; SQL is also cancelled by the database through a statement timeout.
  </>,
];

export function Guardrails() {
  return (
    <DocSection id="guardrails" lead="docker_safe_exec is the only tool that runs anything. It is built to say no.">
      <Bullets items={GUARDRAILS.map((guardrail) => <><strong className="text-ink">{guardrail.title}.</strong> {guardrail.body}</>)} />

      <H3>Evaluation order</H3>
      <ol className="list-decimal space-y-2 pl-6 leading-relaxed text-ink-dim marker:font-mono marker:text-sky-400">
        {ORDER.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      <H3>Allowlisted binaries</H3>
      <p className="flex flex-wrap gap-2" data-testid="allowed-binaries">
        {ALLOWED_BINARIES.map((binary) => (
          <Badge key={binary} tone="signal">
            {binary}
          </Badge>
        ))}
      </p>

      <H3>Rules</H3>
      <DataTable caption="Exec policy rules" columns={['Example', 'Verdict', 'Reason returned']} rows={RULE_ROWS} />

      <Callout title="Regex input is guarded too">
        <C>filter_pattern</C> is capped at {MAX_PATTERN_LENGTH} characters. Shapes that make a regex engine backtrack
        catastrophically, such as <C>(a+)+</C> or <C>(a|aa)+</C>, and patterns with more than two unbounded
        quantifiers are rejected with JSON-RPC error <C>-32602</C>. A production server should use a linear-time
        engine such as RE2.
      </Callout>
      <P>
        Secrets are redacted on the way out as well: <C>env</C> returns values such as passwords and tokens as{' '}
        <C>«redacted»</C>.
      </P>
    </DocSection>
  );
}
