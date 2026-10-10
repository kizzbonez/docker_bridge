import { useState, type FormEvent } from 'react';
import { useAction } from '@/features/auth/hooks/use-action';
import { authApi } from '@/features/auth/model/auth-api';
import { CodeInput, FormError, SubmitButton } from '@/features/auth/ui/form-parts';
import { RecoveryCodes } from '@/features/auth/ui/recovery-codes';
import { Field } from '@/shared/ui/field';
import { Panel } from './panel';

/** Replaces all recovery codes; the old set stops working immediately. */
export function RecoveryPanel({ onChanged }: { onChanged: () => void }) {
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const submit = useAction(async () => {
    const { recoveryCodes } = await authApi.regenerateCodes(code);
    setCodes(recoveryCodes);
    setCode('');
    onChanged();
  });
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    void submit.run();
  };

  return (
    <Panel id="recovery" title="Recovery codes" lead="Generate a new set if the old one is running low or may have been seen.">
      {codes && (
        <div className="mb-5 space-y-2">
          <p role="status" className="text-sm text-emerald-400">
            New codes generated. They are shown only now.
          </p>
          <RecoveryCodes codes={codes} />
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Authenticator code" htmlFor="account-recovery-code" hint="6 digits">
          <CodeInput id="account-recovery-code" required value={code} onChange={(event) => setCode(event.target.value)} />
        </Field>
        <FormError message={submit.error} />
        <SubmitButton pending={submit.pending} disabled={code.length !== 6}>
          Generate new codes
        </SubmitButton>
      </form>
    </Panel>
  );
}
