import { CHECKLIST, ISSUE_TEXT, STRENGTH_LABEL, passwordIssues, passwordStrength, type Strength } from '@auth/password-policy';
import { cx } from '@/shared/lib/cx';

const BAR: Record<Strength, string> = {
  0: 'bg-red-500',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-500',
  4: 'bg-emerald-400',
};

interface PolicyMeterProps {
  password: string;
  username: string;
}

/**
 * Live feedback while choosing a password. The rules come from the same
 * module the server enforces, so what turns green here is what gets accepted.
 */
export function PasswordPolicyMeter({ password, username }: PolicyMeterProps) {
  const issues = passwordIssues(password, username);
  const strength = passwordStrength(password, username);
  return (
    <div className="space-y-2" data-testid="policy-meter">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((level) => (
            <span key={level} className={cx('h-1.5 flex-1 rounded-full', strength >= level ? BAR[strength] : 'bg-carbon-600')} />
          ))}
        </div>
        <p className="w-20 text-right font-mono text-[11px] text-ink-dim">
          <span className="sr-only">Password strength: </span>
          {password === '' ? '—' : STRENGTH_LABEL[strength]}
        </p>
      </div>
      <ul className="space-y-1 font-mono text-[11px]">
        {CHECKLIST.map((issue) => {
          const met = password !== '' && !issues.includes(issue);
          return (
            <li key={issue} className={met ? 'text-emerald-400' : 'text-ink-mute'}>
              <span aria-hidden="true">{met ? '✓' : '○'} </span>
              {ISSUE_TEXT[issue]}
              <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
