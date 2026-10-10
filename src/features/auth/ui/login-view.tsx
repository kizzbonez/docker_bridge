import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Field, TextInput } from '@/shared/ui/field';
import { useAction } from '../hooks/use-action';
import { authApi } from '../model/auth-api';
import { navigate, nextDestination } from '../model/navigation';
import { CodeInput, FormError, PasswordInput, SubmitButton } from './form-parts';
import { PortalShell } from './portal-shell';

const prevent = (run: () => Promise<void>) => (event: FormEvent) => {
  event.preventDefault();
  void run();
};

function PasswordStep({ onChallenge }: { onChallenge: (challenge: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = useAction(async () => onChallenge((await authApi.login(username, password)).challenge));

  return (
    <form onSubmit={prevent(submit.run)} className="space-y-4" data-testid="login-password-step">
      <Field label="Username" htmlFor="login-username">
        <TextInput id="login-username" name="username" autoComplete="username" autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <PasswordInput id="login-password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      <FormError message={submit.error} />
      <SubmitButton pending={submit.pending}>Continue</SubmitButton>
    </form>
  );
}

interface SecondFactorProps {
  challenge: string;
  onRestart: () => void;
}

function SecondFactorStep({ challenge, onRestart }: SecondFactorProps) {
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState('');
  const submit = useAction(async () => {
    await authApi.verify(challenge, code);
    navigate(nextDestination());
  });
  const swap = (): void => {
    setRecovery((value) => !value);
    setCode('');
  };

  return (
    <form onSubmit={prevent(submit.run)} className="space-y-4" data-testid="login-second-factor-step">
      {recovery ? (
        <Field label="Recovery code" htmlFor="login-code" hint="single use">
          <TextInput id="login-code" autoComplete="off" autoFocus required placeholder="XXXXX-XXXXX" value={code} onChange={(event) => setCode(event.target.value)} />
        </Field>
      ) : (
        <Field label="Authenticator code" htmlFor="login-code" hint="6 digits">
          <CodeInput id="login-code" autoFocus required value={code} onChange={(event) => setCode(event.target.value)} />
        </Field>
      )}
      <FormError message={submit.error} />
      <SubmitButton pending={submit.pending}>Verify and sign in</SubmitButton>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="quiet" className="px-2 py-1 text-xs" onClick={swap}>
          {recovery ? 'Use the authenticator app' : 'Use a recovery code instead'}
        </Button>
        <Button variant="quiet" className="px-2 py-1 text-xs" onClick={onRestart}>
          Start again
        </Button>
      </div>
    </form>
  );
}

/** Two-step sign-in: password first, then a second factor. */
export function LoginView() {
  const [challenge, setChallenge] = useState<string | null>(null);
  if (challenge === null) {
    return (
      <PortalShell eyebrow="auth // sign in" title="Sign in to the console" lead="Use the administrator account created during setup.">
        <PasswordStep onChallenge={setChallenge} />
      </PortalShell>
    );
  }
  return (
    <PortalShell eyebrow="auth // step 2 of 2" title="Confirm it is you" lead="Open your authenticator app and enter the current code for DockerBridge.">
      <SecondFactorStep challenge={challenge} onRestart={() => setChallenge(null)} />
    </PortalShell>
  );
}
