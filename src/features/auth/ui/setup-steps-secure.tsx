import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { CopyButton } from '@/shared/ui/copy-button';
import { Field } from '@/shared/ui/field';
import { useAction } from '../hooks/use-action';
import { authApi, type Enrollment } from '../model/auth-api';
import { navigate } from '../model/navigation';
import { CodeInput, FormError, SubmitButton } from './form-parts';
import { QrCode } from './qr-code';
import { RecoveryCodes } from './recovery-codes';

/** "JBSW Y3DP EHPK 3PXP": easier to type by hand than one long run. */
const grouped = (secret: string): string => secret.replace(/(.{4})/g, '$1 ').trim();

export interface AuthenticatorStepProps {
  token: string;
  username: string;
  password: string;
  enrollment: Enrollment;
  onBack: () => void;
  onDone: (recoveryCodes: string[]) => void;
}

/** Step 3: scan the QR code, then prove the authenticator works. */
export function AuthenticatorStep({ token, username, password, enrollment, onBack, onDone }: AuthenticatorStepProps) {
  const [code, setCode] = useState('');
  const submit = useAction(async () => onDone((await authApi.setupComplete(token, username, password, code)).recoveryCodes));
  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    void submit.run();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="setup-authenticator-step">
      <div className="flex flex-wrap items-start gap-5">
        <QrCode value={enrollment.uri} label="QR code for your authenticator app" />
        <div className="min-w-0 flex-1 space-y-3 text-sm leading-relaxed text-ink-dim">
          <p>Scan this with an authenticator app such as Google Authenticator, 1Password or Aegis.</p>
          <p>Cannot scan? Enter this key by hand:</p>
          <p data-testid="totp-secret" className="font-mono text-[13px] break-words text-cyan-300">
            {grouped(enrollment.secret)}
          </p>
          <CopyButton text={enrollment.secret} label="Copy key" variant="quiet" className="px-2 py-1 text-xs" />
        </div>
      </div>
      <Field label="Code from the app" htmlFor="setup-code" hint="6 digits">
        <CodeInput id="setup-code" autoFocus required value={code} onChange={(event) => setCode(event.target.value)} />
      </Field>
      <FormError message={submit.error} />
      <SubmitButton pending={submit.pending} disabled={code.length !== 6}>
        Verify and create account
      </SubmitButton>
      <Button variant="quiet" className="px-2 py-1 text-xs" onClick={onBack}>
        ← Back
      </Button>
    </form>
  );
}

/** Step 4: the only time recovery codes are ever shown. */
export function RecoveryStep({ codes }: { codes: string[] }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-4" data-testid="setup-recovery-step">
      <p className="text-sm leading-relaxed text-ink-dim">
        Your account is ready and you are signed in. These ten codes each work once if you lose your authenticator. They
        are not shown again: store them somewhere safe and offline.
      </p>
      <RecoveryCodes codes={codes} />
      <label htmlFor="setup-saved" className="flex cursor-pointer items-center gap-3 text-sm text-ink">
        <input id="setup-saved" type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="h-4 w-4 accent-cyan-500" />
        I have stored my recovery codes
      </label>
      <Button variant="primary" className="w-full" disabled={!saved} onClick={() => navigate('/')}>
        Open the dashboard
      </Button>
    </div>
  );
}
