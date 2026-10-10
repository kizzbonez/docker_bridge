// The policy that decides whether docker_safe_exec may run a command. The
// real server enforces it; the dashboard simulates and documents the same
// rules from this file.
//
// It is a guardrail, not a sandbox: it narrows what can be asked for, and the
// container's own permissions remain the real boundary.

export const MAX_COMMAND_LENGTH = 200;

/** Diagnostic binaries that may be spawned. Bare names only: no paths. */
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
  /** Binaries the rule applies to. Omitted: every command. */
  binaries?: readonly string[];
  test: RegExp;
  /** `deny` is unconditional; `mutating` passes only when READ_ONLY_MODE=false. */
  verdict: 'deny' | 'mutating';
  reason: string;
  /** A command this rule catches; used by the documentation and the tests. */
  example: string;
}

const NEEDS_WRITE = 'changes runtime state: requires READ_ONLY_MODE=false';
const DATABASE_CLIENTS = ['psql', 'pg_isready', 'redis-cli'];

/** Checked before the allowlist, so `ls; id` is named for what it is. */
const SHELL_RULE: ExecRule = {
  test: /[;&|`$<>\\\n]/,
  verdict: 'deny',
  reason: 'shell metacharacters are rejected: commands are spawned as argv, never through a shell',
  example: 'ps | grep node',
};

const GENERAL_RULES: ExecRule[] = [
  {
    test: /\/run\/secrets|\/proc\/|\/dev\/|\/sys\/|\/etc\/shadow|\.ssh\/|\.(pem|key|p12|pfx|kdbx)(\s|$)|(^|[\s/])\.env(\.\w+)?(\s|$)|\bid_(rsa|ed25519|ecdsa)\b/i,
    verdict: 'deny',
    reason: 'reads of credential material and device files are blocked',
    example: 'cat /run/secrets/db_password',
  },
  {
    binaries: ['env'],
    test: /^env\s+\S/,
    verdict: 'deny',
    reason: 'env takes no arguments here: with arguments it would launch another program',
    example: 'env sh -c id',
  },
  {
    binaries: ['sleep'],
    test: /^sleep(?!\s+\d+(\.\d+)?\s*$)/,
    verdict: 'deny',
    reason: 'sleep takes a single number of seconds',
    example: 'sleep infinity',
  },
  {
    binaries: ['nginx'],
    test: /^nginx(?!\s+(-[tTvV]|-s\s+(reload|reopen))\s*$)/,
    verdict: 'deny',
    reason: 'only nginx -t, -T, -v, -V and -s reload|reopen are available',
    example: 'nginx -s stop',
  },
  {
    binaries: ['nginx'],
    test: /\s-s\s+(reload|reopen)\b/,
    verdict: 'mutating',
    reason: NEEDS_WRITE,
    example: 'nginx -s reload',
  },
  {
    binaries: DATABASE_CLIENTS,
    test: /:\/\/|\bhost(addr)?=|(^|\s)(-u|--uri)(\s|=|$)|(^|\s)(-h|--host)[\s=]+(?!(localhost|127\.0\.0\.1|::1)(\s|$))\S/,
    verdict: 'deny',
    reason: 'database clients may only connect to the container itself (localhost)',
    example: 'psql -h 10.0.0.5 -c "select 1"',
  },
];

const SQL_RULES: ExecRule[] = [
  {
    binaries: ['psql'],
    test: /(^|\s)(-f|--file|-o|--output|-L|--log-file)(\s|=|$)/,
    verdict: 'deny',
    reason: 'psql file input and output are blocked',
    example: 'psql -f /tmp/script.sql',
  },
  {
    binaries: ['psql'],
    test: /\b(drop|delete|truncate|alter|update|insert|grant|revoke|create|copy|call|vacuum|reindex|refresh|lock|comment|set|reset|begin|commit|merge|do)\b/i,
    verdict: 'deny',
    reason: 'mutating SQL is blocked',
    example: 'psql -U postgres -c "drop table orders"',
  },
  {
    binaries: ['psql'],
    test: /\b(pg_terminate_backend|pg_cancel_backend|pg_read_(binary_)?file|pg_ls_\w+|pg_stat_file|lo_(import|export)|dblink\w*|pg_sleep\w*|set_config|pg_rotate_logfile|pg_promote|pg_switch_wal|pg_shadow|pg_authid|pg_file_\w+)\b/i,
    verdict: 'deny',
    reason: 'SQL that reads server files or credentials, or signals other sessions, is blocked',
    example: 'psql -c "select * from pg_shadow"',
  },
  {
    binaries: ['psql'],
    test: /\bpg_reload_conf\b/i,
    verdict: 'mutating',
    reason: NEEDS_WRITE,
    example: 'psql -c "select pg_reload_conf()"',
  },
];

const REDIS_RULES: ExecRule[] = [
  {
    binaries: ['redis-cli'],
    test: /\b(flushall|flushdb|shutdown|debug|migrate|restore|replicaof|slaveof|failover|script|eval\w*|fcall\w*|function|module|acl|bgsave|bgrewriteaof|save|swapdb|monitor|p?subscribe|p?sync|keys)\b/i,
    verdict: 'deny',
    reason: 'destructive, blocking or scripting redis commands are blocked',
    example: 'redis-cli flushall',
  },
  {
    binaries: ['redis-cli'],
    test: /\b(config\s+(set|rewrite|resetstat)|client\s+(kill|pause|unpause)|slowlog\s+reset|latency\s+reset|memory\s+purge|set(ex|nx|range)?|mset(nx)?|getset|getdel|del|unlink|p?expire(at)?|persist|incr(by(float)?)?|decr(by)?|append|[lr]push(x)?|[lr]pop|lset|ltrim|lrem|sadd|srem|spop|smove|zadd|zrem\w*|zincrby|hset(nx)?|hmset|hdel|hincrby(float)?|rename(nx)?|move|copy|touch|xadd|xdel|xtrim|publish)\b/i,
    verdict: 'mutating',
    reason: NEEDS_WRITE,
    example: 'redis-cli config set maxmemory 384mb',
  },
];

/** Every rule, in evaluation order. One deny anywhere refuses the command. */
export const EXEC_RULES: ExecRule[] = [SHELL_RULE, ...GENERAL_RULES, ...SQL_RULES, ...REDIS_RULES];

export interface Verdict {
  allowed: boolean;
  guardrail: string;
}

export function binaryOf(command: string): string {
  return command.trim().split(/\s+/)[0] ?? '';
}

/** Problems with the command's shape, before any rule about its meaning. */
function structuralProblem(command: string): string | null {
  if (command === '') return 'command is empty';
  if (command.length > MAX_COMMAND_LENGTH) return `command exceeds ${MAX_COMMAND_LENGTH} characters`;
  if (SHELL_RULE.test.test(command)) return SHELL_RULE.reason;
  const binary = binaryOf(command);
  const allowlisted = (ALLOWED_BINARIES as readonly string[]).includes(binary);
  return allowlisted ? null : `binary "${binary}" is not on the diagnostic allowlist`;
}

/**
 * Decides whether a command may run. Every rule is checked: a deny always
 * wins, and a state-changing command passes only outside read-only mode.
 */
export function evaluateCommand(rawCommand: string, readOnly: boolean): Verdict {
  const command = rawCommand.trim();
  const problem = structuralProblem(command);
  if (problem) return { allowed: false, guardrail: problem };

  const binary = binaryOf(command);
  const hits = EXEC_RULES.filter((rule) => (!rule.binaries || rule.binaries.includes(binary)) && rule.test.test(command));
  const refusal = hits.find((rule) => rule.verdict === 'deny') ?? (readOnly ? hits[0] : undefined);
  if (refusal) return { allowed: false, guardrail: refusal.reason };

  const mutating = hits.length > 0;
  return {
    allowed: true,
    guardrail: mutating ? 'state-changing command permitted: READ_ONLY_MODE=false' : 'read-only diagnostic allowlist',
  };
}
