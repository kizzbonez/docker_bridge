import { useState, type FormEvent } from 'react';
import { MAX_COMMAND_LENGTH } from '@bridge/core/exec-policy';
import { Button } from '@/shared/ui/button';
import { Field, RangeInput, TextInput } from '@/shared/ui/field';
import { useToolCall } from '../hooks/use-tool-call';
import type { BridgeInfo, ExecResult as Result } from '../model/console-api';
import { ExecResult } from './exec-result';
import { Notice } from './notice';
import { PendingResult } from './result-frame';

/** Harmless on any image; the last one is there to show a refusal. */
const PRESETS = ['ps', 'df -h', 'env', 'ls -la /', 'rm -rf /tmp'];

interface PresetsProps {
  onPick: (command: string) => void;
}

function Presets({ onPick }: PresetsProps) {
  return (
    <ul aria-label="Example commands" className="flex flex-wrap gap-1.5">
      {PRESETS.map((command) => (
        <li key={command}>
          <button
            type="button"
            onClick={() => onPick(command)}
            className="rounded-md border border-cyan-500/15 px-2 py-1 font-mono text-[11px] text-ink-dim transition-colors hover:border-cyan-400/40 hover:text-ink"
          >
            {command}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** What the visitor should know before running anything here. */
function Rules({ bridge, ownStack }: { bridge: BridgeInfo; ownStack: boolean }) {
  if (ownStack) {
    return (
      <Notice tone="warn" title="this is the console's own stack">
        It holds the sign-in secrets, so the console refuses to run any command in it. Logs can still be read.
      </Notice>
    );
  }
  return (
    <p className="text-xs leading-relaxed text-ink-mute">
      One allowlisted binary, run as argv with a deadline: no shell, pipes or redirects.{' '}
      {bridge.readOnly ? 'Read-only mode is on, so anything that changes state is refused.' : 'Read-only mode is off: the few state-changing commands the policy allows will run.'}
    </p>
  );
}

interface ExecToolProps {
  project: string;
  container: string;
  bridge: BridgeInfo;
}

/** `docker_safe_exec` against the chosen container. */
export function ExecTool({ project, container, bridge }: ExecToolProps) {
  const [command, setCommand] = useState('ps');
  const [deadline, setDeadline] = useState(2000);
  const call = useToolCall<Result>('docker_safe_exec');
  const submit = (event: FormEvent): void => {
    event.preventDefault();
    void call.run({ container, project, command, timeout_ms: deadline });
  };

  if (!bridge.execEnabled) {
    return (
      <Notice tone="mute" title="running commands from the browser is switched off">
        This console was started with CONSOLE_EXEC=false. Agents connected to the MCP server are not affected.
      </Notice>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form onSubmit={submit} className="min-w-0 space-y-4" aria-label="Run a diagnostic command">
        <Field label="command" htmlFor="exec-command" hint="one binary, no shell">
          <TextInput id="exec-command" value={command} maxLength={MAX_COMMAND_LENGTH + 20} onChange={(event) => setCommand(event.target.value)} />
        </Field>
        <Presets onPick={setCommand} />
        <Field label="timeout_ms" htmlFor="exec-timeout" hint={`${deadline} ms`}>
          <RangeInput id="exec-timeout" min={250} max={10000} step={250} value={deadline} onChange={(event) => setDeadline(Number(event.target.value))} />
        </Field>
        <Rules bridge={bridge} ownStack={bridge.selfProject === project} />
        <Button type="submit" variant="primary" disabled={call.pending || command.trim() === ''} className="w-full">
          {call.pending ? 'Running…' : `Run in ${container}`}
        </Button>
      </form>
      <div className="min-w-0" aria-live="polite">
        {call.reply && !call.pending ? <ExecResult reply={call.reply} /> : <PendingResult pending={call.pending} problem={call.problem} invitation="Pick a command and run it. Every run is checked against the exec policy first." />}
      </div>
    </div>
  );
}
