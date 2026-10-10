import type { Tone } from '@/shared/lib/tone';
import { Badge } from '@/shared/ui/badge';
import { isFailure, type ExecResult as Result, type ToolReply } from '../model/console-api';
import { Notice } from './notice';
import { ResultFrame } from './result-frame';

function verdict(result: Result): { label: string; tone: Tone } {
  if (!result.allowed) return { label: 'blocked', tone: 'crit' };
  if (result.timed_out) return { label: 'timed out', tone: 'warn' };
  return result.exit_code === 0 ? { label: 'allowed', tone: 'ok' } : { label: `exit ${result.exit_code ?? '?'}`, tone: 'warn' };
}

function Summary({ result }: { result: Result }) {
  const { label, tone } = verdict(result);
  return (
    <>
      <Badge tone="signal">{result.container}</Badge>
      <Badge tone={tone}>{label}</Badge>
      {result.allowed && (
        <Badge tone="mute">
          exit {result.exit_code ?? '—'} · {result.duration_ms} ms
        </Badge>
      )}
    </>
  );
}

function Stream({ name, text }: { name: string; text: string }) {
  if (text === '') return null;
  return (
    <div className="border-t border-cyan-500/10 first:border-t-0">
      <p className="px-3 pt-2 font-mono text-[11px] tracking-wider text-sky-300 uppercase">{name}</p>
      <pre tabIndex={0} role="group" aria-label={name} className="code-pane max-h-80 px-3 pt-1 pb-3 whitespace-pre-wrap text-ink-dim">
        {text}
      </pre>
    </div>
  );
}

/** The answer of `docker_safe_exec`: the verdict of the policy, then what the command printed. */
export function ExecResult({ reply }: { reply: ToolReply<Result> }) {
  if (isFailure(reply.structured)) {
    return <Notice tone="crit" title="the command could not be run">{reply.structured.error}</Notice>;
  }
  const result = reply.structured;
  return (
    <ResultFrame summary={<Summary result={result} />}>
      <p data-testid="guardrail" className="px-3 py-2 text-sm leading-relaxed text-ink-dim">
        <span className="font-mono text-[11px] tracking-wider text-sky-300 uppercase">policy </span>
        {result.guardrail}
      </p>
      <Stream name="stdout" text={result.stdout} />
      <Stream name="stderr" text={result.stderr} />
    </ResultFrame>
  );
}
