// Pure and dependency-free on purpose: the browser imports this same module,
// so the onboarding checklist and the server can never disagree.

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;

export type PolicyIssue = 'too_short' | 'too_long' | 'contains_username' | 'too_common' | 'low_variety';

export const ISSUE_TEXT: Record<PolicyIssue, string> = {
  too_short: `At least ${MIN_PASSWORD_LENGTH} characters`,
  too_long: `At most ${MAX_PASSWORD_LENGTH} characters`,
  contains_username: 'Does not contain your username',
  too_common: 'Not a commonly used password',
  low_variety: 'At least 6 different characters',
};

/** The issues shown as a live checklist, in display order. */
export const CHECKLIST: PolicyIssue[] = ['too_short', 'low_variety', 'contains_username', 'too_common'];

// Length does the heavy lifting; this catches the long-but-predictable favourites.
const COMMON = new Set([
  'password1234', 'password12345', 'passwordpassword', '123456789012', '1234567890123', '12345678901234',
  'qwertyuiop12', 'qwertyuiopas', 'qwerty123456', '1q2w3e4r5t6y', 'administrator', 'administrator1',
  'letmein12345', 'welcome12345', 'changeme1234', 'iloveyou1234', 'adminadmin12', 'adminadminadmin',
  'dockerbridge', 'dockerbridge1', 'correcthorsebatterystaple', 'trustno1trustno1', 'passw0rdpassw0rd',
]);

const normalize = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

function isCommon(password: string): boolean {
  const plain = normalize(password);
  return COMMON.has(plain) || /^(.)\1*$/.test(password) || /^(0123456789|1234567890|abcdefghij)/.test(plain);
}

/** Length and a blocklist, per NIST SP 800-63B; no forced character classes. */
export function passwordIssues(password: string, username: string): PolicyIssue[] {
  const issues: PolicyIssue[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) issues.push('too_short');
  if (password.length > MAX_PASSWORD_LENGTH) issues.push('too_long');
  if (new Set(password).size < 6) issues.push('low_variety');
  const name = normalize(username);
  if (name.length >= 3 && normalize(password).includes(name)) issues.push('contains_username');
  if (isCommon(password)) issues.push('too_common');
  return issues;
}

export type Strength = 0 | 1 | 2 | 3 | 4;
export const STRENGTH_LABEL: Record<Strength, string> = { 0: 'Too weak', 1: 'Weak', 2: 'Fair', 3: 'Strong', 4: 'Excellent' };

/** Advisory estimate from length and character-set size. Never the gate: `passwordIssues` is. */
export function passwordStrength(password: string, username: string): Strength {
  if (password === '' || passwordIssues(password, username).length > 0) return password.length >= 8 ? 1 : 0;
  const pools = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((pool) => pool.test(password)).length;
  const bits = password.length * Math.log2([0, 26, 36, 62, 94][pools] ?? 26);
  if (bits >= 110) return 4;
  return bits >= 80 ? 3 : 2;
}
