import { useState, type FormEvent } from 'react';
import { MAX_PATTERN_LENGTH } from '@bridge/core/filter-pattern';
import { Button } from '@/shared/ui/button';
import { TailRanges } from '@/features/tool-playground/ui/tail-ranges';
import { Field, TextInput } from '@/shared/ui/field';
import { Toggle } from '@/shared/ui/toggle';
import { useToolCall } from '../hooks/use-tool-call';
import type { TailResult } from '../model/console-api';
import { LogResult } from './log-result';
import { PendingResult } from './result-frame';

interface TailArgs {
  filter_pattern: string;
  tail_lines: number;
  token_budget: number;
  strip_ansi: boolean;
}

const DEFAULTS: TailArgs = { filter_pattern: '', tail_lines: 200, token_budget: 320, strip_ansi: true };

interface LogsToolProps {
  project: string;
  container: string;
}

/** `docker_tail_filtered_logs` against the chosen container. */
export function LogsTool({ project, container }: LogsToolProps) {
  const [args, setArgs] = useState<TailArgs>(DEFAULTS);
  const patch = (change: Partial<TailArgs>): void => setArgs((current) => ({ ...current, ...change }));
  const call = useToolCall<TailResult>('docker_tail_filtered_logs');
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    void call.run({ container, project, ...args });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form onSubmit={submit} className="min-w-0 space-y-4" aria-label="Tail a filtered log">
        <Field label="filter_pattern" htmlFor="logs-pattern" hint="regex, case-insensitive">
          <TextInput id="logs-pattern" value={args.filter_pattern} placeholder="error|timeout  (empty keeps every line)" maxLength={MAX_PATTERN_LENGTH + 20} onChange={(event) => patch({ filter_pattern: event.target.value })} />
        </Field>
        <Toggle id="logs-ansi" label="strip_ansi" checked={args.strip_ansi} onChange={(strip_ansi) => patch({ strip_ansi })} />
        <TailRanges args={args} patch={patch} maxTail={2000} maxBudget={4096} />
        <Button type="submit" variant="primary" disabled={call.pending} className="w-full">
          {call.pending ? 'Reading…' : `Tail ${container}`}
        </Button>
      </form>
      <div className="min-w-0" aria-live="polite">
        {call.reply && !call.pending ? <LogResult reply={call.reply} /> : <PendingResult pending={call.pending} problem={call.problem} invitation="Set a filter and tail the log. Nothing is read until you ask." />}
      </div>
    </div>
  );
}
