import { describe, expect, it } from 'vitest';
import { EXEC_PRESETS } from './exec-outputs';
import { ALLOWED_BINARIES, EXEC_RULES, MAX_COMMAND_LENGTH, evaluateCommand } from './exec-policy';
import { safeExec } from './safe-exec';
import { CONTAINER_IDS } from './types';

describe('evaluateCommand', () => {
  it('allows read-only diagnostics in either mode', () => {
    for (const readOnly of [true, false]) {
      expect(evaluateCommand('pg_isready -h localhost -p 5432', readOnly).allowed).toBe(true);
      expect(evaluateCommand('redis-cli info memory', readOnly).allowed).toBe(true);
    }
  });

  it.each([
    ['rm -rf /', 'allowlist'],
    ['bash -c "id"', 'allowlist'],
    ['curl http://169.254.169.254/', 'allowlist'],
    ['', 'empty'],
  ])('refuses %j', (command, reason) => {
    const verdict = evaluateCommand(command, false);
    expect(verdict.allowed).toBe(false);
    expect(verdict.guardrail).toContain(reason);
  });

  it.each(['ls; id', 'ls && id', 'cat /etc/passwd | sort', 'ls `id`', 'ls $(id)', 'cat x > y', 'ls\nid', 'cat a\\b'])(
    'refuses shell metacharacters in %j even when not read-only',
    (command) => {
      const verdict = evaluateCommand(command, false);
      expect(verdict.allowed).toBe(false);
      expect(verdict.guardrail).toContain('metacharacters');
    },
  );

  it.each(['psql -c "DROP TABLE orders"', 'psql -c "delete from orders"', 'redis-cli FLUSHALL', 'redis-cli shutdown'])(
    'refuses destructive command %j in every mode',
    (command) => {
      expect(evaluateCommand(command, false).allowed).toBe(false);
      expect(evaluateCommand(command, true).allowed).toBe(false);
    },
  );

  it.each(['nginx -s reload', 'redis-cli config set maxmemory 384mb'])(
    'gates state-changing command %j behind READ_ONLY_MODE',
    (command) => {
      expect(evaluateCommand(command, true).allowed).toBe(false);
      expect(evaluateCommand(command, false).allowed).toBe(true);
    },
  );

  it('refuses over-long commands', () => {
    expect(evaluateCommand(`ls ${'a'.repeat(MAX_COMMAND_LENGTH)}`, false).allowed).toBe(false);
  });

  it('documents every rule with an example that the rule actually catches', () => {
    for (const rule of EXEC_RULES) {
      expect(rule.test.test(rule.example)).toBe(true);
      expect(evaluateCommand(rule.example, true).allowed).toBe(false);
    }
  });

  it('never allowlists a shell or a network client', () => {
    for (const binary of ['sh', 'bash', 'curl', 'wget', 'nc', 'docker', 'rm', 'kill']) {
      expect(ALLOWED_BINARIES as readonly string[]).not.toContain(binary);
    }
  });
});

describe('safeExec', () => {
  it('returns canned stdout for a known command', () => {
    const result = safeExec({ container: 'db-postgres', command: 'pg_isready -h localhost -p 5432', timeout_ms: 2000 }, true);
    expect(result).toMatchObject({ allowed: true, exit_code: 0, timed_out: false });
    expect(result.stdout).toContain('accepting connections');
  });

  it('never runs a blocked command', () => {
    const result = safeExec({ container: 'web-gateway', command: 'rm -rf /etc/nginx', timeout_ms: 2000 }, false);
    expect(result).toMatchObject({ allowed: false, exit_code: null, duration_ms: 0, stdout: '' });
    expect(result.stderr).toMatch(/^blocked:/);
  });

  it('kills a command that overruns its timeout', () => {
    const result = safeExec({ container: 'order-api', command: 'sleep 30', timeout_ms: 2000 }, true);
    expect(result).toMatchObject({ allowed: true, timed_out: true, exit_code: null, duration_ms: 2000 });
    expect(result.stderr).toContain('SIGKILL');
  });

  it('lets a short sleep finish', () => {
    const result = safeExec({ container: 'order-api', command: 'sleep 1', timeout_ms: 2000 }, true);
    expect(result).toMatchObject({ timed_out: false, exit_code: 0, duration_ms: 1000 });
  });

  it('redacts secrets from env output', () => {
    const result = safeExec({ container: 'db-postgres', command: 'env', timeout_ms: 2000 }, true);
    expect(result.stdout).toContain('POSTGRES_PASSWORD=«redacted»');
  });

  it('trims the command before evaluating it', () => {
    expect(safeExec({ container: 'order-api', command: '  printenv PORT  ', timeout_ms: 2000 }, true).stdout).toBe('8081');
  });

  it.each(CONTAINER_IDS)('offers %s presets that include a refused command', (container) => {
    const verdicts = EXEC_PRESETS[container].map((command) => safeExec({ container, command, timeout_ms: 2000 }, true));
    expect(verdicts.some((result) => result.allowed && !result.timed_out)).toBe(true);
    expect(verdicts.some((result) => !result.allowed || result.timed_out)).toBe(true);
  });
});
