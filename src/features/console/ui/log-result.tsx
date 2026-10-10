import { formatInt, formatPercent } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { isFailure, type TailResult, type ToolReply } from '../model/console-api';
import { Notice } from './notice';
import { ResultFrame } from './result-frame';

function Summary({ result }: { result: TailResult }) {
  const { raw_tail: raw, returned } = result.tokens;
  const saved = raw > returned ? formatPercent((raw - returned) / raw) : null;
  return (
    <>
      <Badge tone="signal">{result.container}</Badge>
      <Badge tone="mute">
        {formatInt(result.scanned_lines)} scanned · {formatInt(result.matched_lines)} matched · {formatInt(result.returned_lines)} returned
      </Badge>
      <Badge tone="ok">
        ≈ {formatInt(raw)} → {formatInt(returned)} tokens{saved ? ` · ${saved} saved` : ''}
      </Badge>
      {result.truncated && <Badge tone="warn">cut at the token budget</Badge>}
    </>
  );
}

function Lines({ result }: { result: TailResult }) {
  if (result.lines.length === 0) {
    return <p className="p-4 font-mono text-sm text-ink-mute">No line in the last {formatInt(result.scanned_lines)} matched the filter.</p>;
  }
  return (
    // The scrolling, focusable region wraps the list: giving the <ol> itself a role would orphan its items.
    <div tabIndex={0} role="group" aria-label={`Filtered log of ${result.container}`} className="code-pane max-h-[28rem] p-3">
      <ol className="space-y-1">
        {result.lines.map((line) => (
          <li key={line.line} className="flex gap-3">
            <span className="w-10 shrink-0 text-right text-ink-mute tabular-nums select-none">{line.line}</span>
            <span className="min-w-0 break-all whitespace-pre-wrap text-ink-dim">
              {line.repeats > 1 && <span className="mr-2 rounded border border-amber-500/35 bg-amber-500/10 px-1 text-amber-400">×{line.repeats}</span>}
              {line.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The answer of `docker_tail_filtered_logs`: the lines, and what filtering saved. */
export function LogResult({ reply }: { reply: ToolReply<TailResult> }) {
  if (isFailure(reply.structured)) {
    return <Notice tone="crit" title="the log could not be read">{reply.structured.error}</Notice>;
  }
  return (
    <ResultFrame summary={<Summary result={reply.structured} />}>
      <Lines result={reply.structured} />
    </ResultFrame>
  );
}
