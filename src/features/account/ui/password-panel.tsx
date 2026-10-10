import { useState, type FormEvent } from 'react';
import { passwordIssues } from '@auth/password-policy';
import { useAction } from '@/features/auth/hooks/use-action';
import { authApi } from '@/features/auth/model/auth-api';
import { CodeInput, FormError, PasswordInput, SubmitButton } from '@/features/auth/ui/form-parts';
import { PasswordPolicyMeter } from '@/features/auth/ui/password-policy-meter';
import { Field } from '@/shared/ui/field';
import { Panel } from './panel';

const EMPTY = { current: '', next: '', code: '' };

/** Form state plus the submit action; clears the fields once the change succeeds. */
function usePasswordForm(onChanged: () => void) {
  const [values, setValues] = useState(EMPTY);
  const [done, setDone] = useState(false);
  const submit = useAction(async () => {
    setDone(false);
    await authApi.changePassword(values.current, values.next, values.code);
    setValues(EMPTY);
    setDone(true);
    onChanged();
  });
  const set = (name: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setValues((previous) => ({ ...previous, [name]: event.target.value }));
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    void submit.run();
  };
  return { values, set, done, submit, onSubmit };
}

interface PasswordPanelProps {
  username: string;
  onChanged: () => void;
}

/** Changing the password needs the current one and a fresh authenticator code. */
export function PasswordPanel({ username, onChanged }: PasswordPanelProps) {
  const { values, set, done, submit, onSubmit } = usePasswordForm(onChanged);
  const ready = values.current !== '' && values.code.length === 6 && passwordIssues(values.next, username).length === 0;

  return (
    <Panel id="password" title="Change password" lead="Every other session is signed out when the password changes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Current password" htmlFor="account-current">
          <PasswordInput id="account-current" autoComplete="current-password" required value={values.current} onChange={set('current')} />
        </Field>
        <Field label="New password" htmlFor="account-next">
          <PasswordInput id="account-next" autoComplete="new-password" required value={values.next} onChange={set('next')} />
        </Field>
        <PasswordPolicyMeter password={values.next} username={username} />
        <Field label="Authenticator code" htmlFor="account-password-code" hint="6 digits">
          <CodeInput id="account-password-code" required value={values.code} onChange={set('code')} />
        </Field>
        <FormError message={submit.error} />
        {done && (
          <p role="status" className="text-sm text-emerald-400">
            Password changed.
          </p>
        )}
        <SubmitButton pending={submit.pending} disabled={!ready}>
          Change password
        </SubmitButton>
      </form>
    </Panel>
  );
}
