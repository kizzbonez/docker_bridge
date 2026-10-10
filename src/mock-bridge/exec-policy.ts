export const MAX_COMMAND_LENGTH = 200;

/** Diagnostic binaries the sandbox will spawn. Everything else is refused. */
export const ALLOWED_BINARIES = [
  'cat',
  'df',
  'env',
  'ls',
  'nginx',
  'pg_isready',
  'printenv',
  'ps',
  'psql',
  'redis-cli',
  'sleep',
] as const;

export interface ExecRule {
  test: RegExp;
  /** `deny` is unconditional; `mutating` passes only when READ_ONLY_MODE=false. */
  verdict: 'deny' | 'mutating';
  reason: string;
  /** A command this rule catches; used by the documentation. */
  example: string;
}

/** Checked before the allowlist, so `ls; id` is named for what it is. */
const SHELL_RULE: ExecRule = {
  test: /[;&|`$<>\\\n]/,
  verdict: 'deny',
  reason: 'shell metacharacters are rejected: commands are spawned as argv, never through a shell',
  example: 'ps | grep node',
};

/** Every rule, in evaluation order. The first match decides. */
export const EXEC_RULES: ExecRule[] = [
  SHELL_RULE,
  {
    test: /\b(drop|delete|truncate|alter|update|insert|grant|revoke)\b/i,
    verdict: 'deny',
    reason: 'mutating SQL is blocked',
    example: 'psql -U postgres -c "drop table orders"',
  },
  {
    test: /\b(flushall|flushdb|shutdown|debug\s+segfault)\b/i,
    verdict: 'deny',
    reason: 'destructive redis command is blocked',
    example: 'redis-cli flushall',
  },
  {
    // `-s` cannot be anchored with \b: a space followed by "-" is not a word boundary.
    test: /\bconfig\s+set\b|\s-s\s+(reload|stop|quit)\b|\bpg_reload_conf\b/i,
    verdict: 'mutating',
    reason: 'changes runtime state: requires READ_ONLY_MODE=false',
    example: 'nginx -s reload',
  },
];

export interface Verdict {
  allowed: boolean;
  guardrail: string;
}

function binaryOf(command: string): string {
  return command.split(/\s+/)[0] ?? '';
}

function isAllowedBinary(binary: string): boolean {
  return (ALLOWED_BINARIES as readonly string[]).includes(binary);
}

/** Decides whether a command may run. Deny rules win over everything else. */
export function evaluateCommand(rawCommand: string, readOnly: boolean): Verdict {
  const command = rawCommand.trim();
  if (command === '') return { allowed: false, guardrail: 'command is empty' };
  if (command.length > MAX_COMMAND_LENGTH) {
    return { allowed: false, guardrail: `command exceeds ${MAX_COMMAND_LENGTH} characters` };
  }
  if (SHELL_RULE.test.test(command)) return { allowed: false, guardrail: SHELL_RULE.reason };
  const binary = binaryOf(command);
  if (!isAllowedBinary(binary)) {
    return { allowed: false, guardrail: `binary "${binary}" is not on the diagnostic allowlist` };
  }
  for (const rule of EXEC_RULES) {
    if (!rule.test.test(command)) continue;
    if (rule.verdict === 'deny' || readOnly) return { allowed: false, guardrail: rule.reason };
    return { allowed: true, guardrail: 'state-changing command permitted: READ_ONLY_MODE=false' };
  }
  return { allowed: true, guardrail: 'read-only diagnostic allowlist' };
}
