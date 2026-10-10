import { useState, type FormEvent } from 'react';
import { USERNAME_PATTERN, passwordIssues } from '@auth/password-policy';
import { CopyButton } from '@/shared/ui/copy-button';
import { Field, TextInput } from '@/shared/ui/field';
import { useAction } from '../hooks/use-action';
import { authApi, type Enrollment } from '../model/auth-api';
import { FormError, PasswordInput, SubmitButton } from './form-parts';
import { PasswordPolicyMeter } from './password-policy-meter';

const LOGS_COMMAND = 'docker compose logs auth';

const prevent = (run: () => Promise<void>) => (event: FormEvent) => {
  event.preventDefault();
  void run();
};

/** Step 1: prove access to the server by pasting the token from its logs. */
export function TokenStep({ onDone }: { onDone: (token: string) => void }) {
  const [token, setToken] = useState('');
  const submit = useAction(async () => {
    await authApi.setupToken(token.trim());
    onDone(token.trim());
  });

  return (
    <form onSubmit={prevent(submit.run)} className="space-y-4" data-testid="setup-token-step">
      <p className="text-sm leading-relaxed text-ink-dim">
        Setup is reserved for whoever can read this server&apos;s logs. Run the command below on the host and paste the
        one-time token it prints.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-cyan-500/20 bg-carbon-950/70 px-3 py-2">
        <code className="font-mono text-sm text-cyan-300">{LOGS_COMMAND}</code>
        <CopyButton text={LOGS_COMMAND} variant="quiet" className="px-2 py-1 text-xs" />
      </div>
      <Field label="Setup token" htmlFor="setup-token">
        <TextInput id="setup-token" autoComplete="off" autoFocus required placeholder="XXXXX-XXXXX-XXXXX-XXXXX" className="tracking-wider uppercase" value={token} onChange={(event) => setToken(event.target.value)} />
      </Field>
      <FormError message={submit.error} />
      <SubmitButton pending={submit.pending} disabled={token.trim() === ''}>
        Verify token
      </SubmitButton>
    </form>
  );
}

interface AccountStepProps {
  token: string;
  onDone: (username: string, password: string, enrollment: Enrollment) => void;
}

/** Step 2: choose the administrator's username and password. */
export function AccountStep({ token, onDone }: AccountStepProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const submit = useAction(async () => onDone(username, password, await authApi.setupTotp(token, username)));
  const mismatch = confirm !== '' && confirm !== password;
  const ready = USERNAME_PATTERN.test(username) && passwordIssues(password, username).length === 0 && confirm === password;

  return (
    <form onSubmit={prevent(submit.run)} className="space-y-4" data-testid="setup-account-step">
      <Field label="Username" htmlFor="setup-username" hint="3–32 characters">
        <TextInput id="setup-username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
      </Field>
      <Field label="Password" htmlFor="setup-password">
        <PasswordInput id="setup-password" name="new-password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      <PasswordPolicyMeter password={password} username={username} />
      <Field label="Confirm password" htmlFor="setup-confirm">
        <PasswordInput id="setup-confirm" name="confirm-password" autoComplete="new-password" required aria-invalid={mismatch} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      </Field>
      <FormError message={mismatch ? 'The two passwords do not match.' : submit.error} />
      <SubmitButton pending={submit.pending} disabled={!ready}>
        Continue
      </SubmitButton>
    </form>
  );
}
