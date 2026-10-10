import { useState } from 'react';
import { cx } from '@/shared/lib/cx';
import type { Enrollment } from '../model/auth-api';
import { PortalShell } from './portal-shell';
import { AccountStep, TokenStep } from './setup-steps-account';
import { AuthenticatorStep, RecoveryStep } from './setup-steps-secure';

const STEPS = ['token', 'account', 'authenticator', 'recovery'] as const;
type Step = (typeof STEPS)[number];

const COPY: Record<Step, { label: string; title: string; lead: string }> = {
  token: { label: 'Verify', title: 'Welcome. Let’s secure this install', lead: 'This takes about two minutes and only happens once.' },
  account: { label: 'Account', title: 'Create the administrator', lead: 'This is the only account. Choose a long password you do not use anywhere else.' },
  authenticator: { label: 'Authenticator', title: 'Add two-factor authentication', lead: 'Every sign-in will ask for a code from this app.' },
  recovery: { label: 'Recovery', title: 'Save your recovery codes', lead: '' },
};

function Stepper({ current }: { current: Step }) {
  const active = STEPS.indexOf(current);
  return (
    <ol className="mb-6 flex gap-2" aria-label="Setup progress">
      {STEPS.map((step, index) => (
        <li key={step} aria-current={index === active ? 'step' : undefined} className="min-w-0 flex-1">
          <span className={cx('block h-1 rounded-full', index <= active ? 'bg-cyan-500' : 'bg-carbon-600')} />
          <span className={cx('mt-1.5 block truncate font-mono text-[11px]', index === active ? 'text-cyan-300' : 'text-ink-mute')}>
            {index + 1}. {COPY[step].label}
          </span>
        </li>
      ))}
    </ol>
  );
}

interface Draft {
  token: string;
  username: string;
  password: string;
  enrollment: Enrollment | null;
  recoveryCodes: string[];
}

const EMPTY: Draft = { token: '', username: '', password: '', enrollment: null, recoveryCodes: [] };

/** First-run onboarding: token → account → authenticator → recovery codes. */
export function SetupWizard() {
  const [step, setStep] = useState<Step>('token');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const advance = (change: Partial<Draft>, next: Step): void => {
    setDraft((current) => ({ ...current, ...change }));
    setStep(next);
  };
  const { title, lead } = COPY[step];

  return (
    <PortalShell eyebrow={`setup // step ${STEPS.indexOf(step) + 1} of ${STEPS.length}`} title={title} lead={lead}>
      <Stepper current={step} />
      {step === 'token' && <TokenStep onDone={(token) => advance({ token }, 'account')} />}
      {step === 'account' && (
        <AccountStep token={draft.token} onDone={(username, password, enrollment) => advance({ username, password, enrollment }, 'authenticator')} />
      )}
      {step === 'authenticator' && draft.enrollment && (
        <AuthenticatorStep
          token={draft.token}
          username={draft.username}
          password={draft.password}
          enrollment={draft.enrollment}
          onBack={() => setStep('account')}
          // The password has done its job: drop it from memory with the token.
          onDone={(recoveryCodes) => advance({ recoveryCodes, password: '', token: '' }, 'recovery')}
        />
      )}
      {step === 'recovery' && <RecoveryStep codes={draft.recoveryCodes} />}
    </PortalShell>
  );
}
