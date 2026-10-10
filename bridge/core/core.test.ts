// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { splitArgv } from './argv.ts';
import { ALLOWED_BINARIES, EXEC_RULES, evaluateCommand } from './exec-policy.ts';
import { MAX_RETURNED_LINE_LENGTH, runLogPipeline } from './log-pipeline.ts';
import { REDACTED, isSecretName, redactEnvLines, redactSecrets } from './redact.ts';
import { clip, estimateTokens, stripAnsi } from './text.ts';
import { TOOL_SPECS } from './tool-specs.ts';
import { buildTopology } from './topology.ts';
import { validateArgs } from './validate-args.ts';

const refused = (command: string, readOnly = false): string | null => {
  const verdict = evaluateCommand(command, readOnly);
  return verdict.allowed ? null : verdict.guardrail;
};

describe('splitArgv', () => {
  it('splits on whitespace and keeps quoted words together, expanding nothing', () => {
    expect(splitArgv('ls -la /app')).toEqual(['ls', '-la', '/app']);
    expect(splitArgv('psql -U postgres -tAc "select count(*) from pg_stat_activity"')).toEqual(['psql', '-U', 'postgres', '-tAc', 'select count(*) from pg_stat_activity']);
    expect(splitArgv("printenv 'MY VAR'  ")).toEqual(['printenv', 'MY VAR']);
    expect(splitArgv('cat ""')).toEqual(['cat', '']);
    expect(splitArgv('cat ~/*.txt')).toEqual(['cat', '~/*.txt']);
    expect(splitArgv('   ')).toEqual([]);
  });

  it('reports an unterminated quote instead of guessing', () => {
    expect(splitArgv('psql -c "select 1')).toBeNull();
  });
});

describe('exec policy: closing the ways around the allowlist', () => {
  it('does not let env or a path be used to launch another program', () => {
    expect(refused('env sh -c id')).toContain('env takes no arguments');
    expect(refused('env FOO=1 rm -rf /data')).toContain('env takes no arguments');
    expect(refused('/bin/cat /etc/hostname')).toContain('allowlist');
    expect(refused('./ls')).toContain('allowlist');
    expect(refused('env')).toBeNull();
  });

  it.each([
    'cat /run/secrets/db_password',
    'cat /etc/../run/secrets/db_password',
    'cat /proc/1/environ',
    'cat ../../proc/self/environ',
    'cat /dev/zero',
    'cat /etc/shadow',
    'cat /root/.ssh/id_ed25519',
    'cat /etc/nginx/ssl/server.key',
    'cat /app/.env',
    'cat /app/.env.production',
    'ls /home/app/.ssh/',
  ])('refuses credential material and devices: %s', (command) => {
    expect(refused(command)).toContain('credential material');
  });

  it('keeps database clients on localhost', () => {
    for (const command of ['psql -h 10.0.0.5 -c "select 1"', 'psql --host=db.internal -c "select 1"', 'psql postgresql://db/app', 'psql "host=10.0.0.5 dbname=x"', 'redis-cli -h cache.internal ping', 'redis-cli -u redis://other:6379 ping', 'pg_isready -h 192.168.1.9']) {
      expect(refused(command), command).toContain('localhost');
    }
    for (const command of ['pg_isready -h localhost -p 5432', 'psql -h 127.0.0.1 -c "select 1"', 'redis-cli -h localhost ping', 'redis-cli ping']) {
      expect(refused(command), command).toBeNull();
    }
  });

  it('allows SQL that reads and refuses SQL that writes, reads files or signals sessions', () => {
    for (const command of ['psql -c "select count(*) from pg_stat_activity"', 'psql -c "show max_connections"', 'psql -c "select * from pg_locks"', 'psql -c "explain select 1"', 'psql -c "select setting from pg_settings"']) {
      expect(refused(command, true), command).toBeNull();
    }
    for (const command of ['psql -c "create table t(a int)"', 'psql -c "copy t to program"', 'psql -c "vacuum full"', 'psql -c "SET role admin"', 'psql -c "select pg_terminate_backend(42)"', 'psql -c "select pg_read_file(1)"', 'psql -c "select * from pg_shadow"', 'psql -f /tmp/x.sql', 'psql --output=/tmp/dump']) {
      expect(refused(command), command).not.toBeNull();
    }
  });

  it('separates redis reads, writes and destructive commands', () => {
    for (const command of ['redis-cli info memory', 'redis-cli config get maxmemory', 'redis-cli dbsize', 'redis-cli get user:42', 'redis-cli client list', 'redis-cli memory usage k']) {
      expect(refused(command, true), command).toBeNull();
    }
    for (const command of ['redis-cli set k v', 'redis-cli del k', 'redis-cli expire k 10', 'redis-cli config rewrite', 'redis-cli client kill 1.2.3.4:5']) {
      expect(refused(command, true), command).toContain('READ_ONLY_MODE');
      expect(refused(command, false), command).toBeNull();
    }
    for (const command of ['redis-cli flushall', 'redis-cli eval x 0', 'redis-cli keys user', 'redis-cli monitor', 'redis-cli bgsave']) {
      expect(refused(command, false), command).toContain('redis');
    }
  });

  it('limits nginx to inspection and reload, and sleep to a number', () => {
    for (const command of ['nginx -T', 'nginx -t', 'nginx -v']) expect(refused(command, true), command).toBeNull();
    for (const command of ['nginx', 'nginx -s stop', 'nginx -s quit', 'nginx -c /tmp/evil.conf', 'nginx -T -s stop']) {
      expect(refused(command, false), command).toContain('only nginx');
    }
    expect(refused('nginx -s reload', true)).toContain('READ_ONLY_MODE');
    expect(refused('nginx -s reload', false)).toBeNull();
    expect(refused('sleep infinity')).toContain('number of seconds');
    expect(refused('sleep 3600')).toContain('30 at most');
    expect(refused('sleep 31')).toContain('30 at most');
    expect(refused('sleep 2')).toBeNull();
    expect(refused('sleep 30')).toBeNull();
  });

  it('lets a deny win even when a state-changing rule matches first', () => {
    expect(refused('redis-cli config set dir /run/secrets', false)).toContain('credential material');
  });

  it('gives every rule an example it catches, scoped to an allowlisted binary', () => {
    for (const rule of EXEC_RULES) {
      expect(rule.test.test(rule.example), rule.example).toBe(true);
      expect(refused(rule.example, true), rule.example).not.toBeNull();
      for (const binary of rule.binaries ?? []) expect(ALLOWED_BINARIES).toContain(binary);
    }
  });
});

describe('redaction', () => {
  it('hides passwords in URLs and secret-looking assignments', () => {
    expect(redactSecrets('connecting to postgres://app:s3cr3t@db:5432/orders')).toBe(`connecting to postgres://app:${REDACTED}@db:5432/orders`);
    expect(redactSecrets('password=hunter2 user=app')).toBe(`password=${REDACTED} user=app`);
    expect(redactSecrets('api_key: "abc 123", retries=3')).toBe(`api_key: ${REDACTED}, retries=3`);
    expect(redactSecrets('DB_PASSWORD=x&next=1')).toBe(`DB_PASSWORD=${REDACTED}&next=1`);
    expect(redactSecrets('GET /healthz 200 1ms')).toBe('GET /healthz 200 1ms');
    expect(redactSecrets('redis://cache-redis:6379 ready')).toBe('redis://cache-redis:6379 ready');
  });

  it('hides whole values in env output by variable name', () => {
    const output = 'PATH=/usr/bin\nDATABASE_URL=postgres://u:p@h/db\nJWT_SECRET=abc\nPORT=8080';
    expect(redactEnvLines(output)).toBe(`PATH=/usr/bin\nDATABASE_URL=${REDACTED}\nJWT_SECRET=${REDACTED}\nPORT=8080`);
    for (const name of ['STRIPE_API_KEY', 'AWS_ACCESS_KEY_ID', 'SECRET_KEY_BASE', 'SIGNING_KEY', 'AUTH_SETUP_TOKEN', 'PGPASSWORD', 'SENTRY_DSN']) {
      expect(isSecretName(name), name).toBe(true);
    }
    // Settings that merely mention auth or sessions stay readable.
    for (const name of ['NODE_ENV', 'AUTH_MAX_FAILURES', 'AUTH_COOKIE_SECURE', 'SESSION_TTL_HOURS', 'KEYBOARD_LAYOUT', 'MONKEY_PATCH']) {
      expect(isSecretName(name), name).toBe(false);
    }
  });

  it('stays fast on a long unbroken string', () => {
    const blob = 'a'.repeat(200_000);
    const started = performance.now();
    redactSecrets(blob);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('log pipeline', () => {
  const options = { filter_pattern: 'error', tail_lines: 100, strip_ansi: true, token_budget: 320 };

  it('numbers lines from the start of what it was given, or from the supplied offset', () => {
    const lines = ['ok', 'error: a', 'ok', 'error: b'];
    const outcome = runLogPipeline(lines, options);
    expect(outcome.ok && outcome.summary.lines.map((line) => line.line)).toEqual([2, 4]);
    const offset = runLogPipeline(lines, options, 101);
    expect(offset.ok && offset.summary.lines.map((line) => line.line)).toEqual([102, 104]);
  });

  it('clips very long lines and redacts secrets before anything is returned', () => {
    const outcome = runLogPipeline([`error ${'x'.repeat(5000)}`, 'error: login failed password=hunter2'], { ...options, token_budget: 4096 });
    if (!outcome.ok) throw new Error(outcome.message);
    expect(outcome.summary.lines[0]?.text.length).toBeLessThan(MAX_RETURNED_LINE_LENGTH + 40);
    expect(outcome.summary.lines[0]?.text).toContain('chars]');
    expect(outcome.summary.lines[1]?.text).toBe(`error: login failed password=${REDACTED}`);
  });

  it('handles an empty log', () => {
    const outcome = runLogPipeline([], options);
    expect(outcome.ok && outcome.summary).toMatchObject({ scanned_lines: 0, matched_lines: 0, returned_lines: 0, truncated: false });
  });
});

describe('text, topology and argument validation', () => {
  it('strips colour and cursor sequences, estimates tokens, clips', () => {
    const esc = String.fromCharCode(27);
    expect(stripAnsi(`${esc}[1;31mfail${esc}[0m ${esc}[2K${esc}[?25hdone`)).toBe('fail done');
    expect(estimateTokens('abcdefgh')).toBe(2);
    expect(clip('abcdef', 3)).toBe('abc… [+3 chars]');
    expect(clip('abc', 3)).toBe('abc');
  });

  it('builds the topology shape and flags only real problems', () => {
    const service = (name: string, health: string) => ({ name, image: 'img', health, restarts: 0, lastExit: null });
    const topology = buildTopology('shop', [service('a', 'healthy'), service('b', 'running'), service('c', 'completed'), service('d', 'unhealthy'), service('e', 'exited')], [{ from: 'a', to: 'b' }]);
    expect(topology.unhealthy).toEqual(['d', 'e']);
    expect(topology.edges).toEqual([{ from: 'a', to: 'b' }]);
  });

  it('validates arguments against a closed schema and applies defaults', () => {
    const schema = TOOL_SPECS.docker_tail_filtered_logs.inputSchema;
    expect(validateArgs(schema, { container: 'web' })).toEqual({ ok: true, args: { container: 'web', filter_pattern: '', tail_lines: 200, strip_ansi: true, token_budget: 320 } });
    expect(validateArgs(schema, {})).toEqual({ ok: false, message: 'missing required argument "container"' });
    expect(validateArgs(schema, { container: 'web', tail_lines: 5 })).toMatchObject({ ok: false, message: expect.stringContaining('at least 10') });
    expect(validateArgs(schema, { container: 'web', tail_lines: 2.5 })).toMatchObject({ ok: false, message: expect.stringContaining('integer') });
    expect(validateArgs(schema, { container: 7 })).toMatchObject({ ok: false, message: expect.stringContaining('must be a string') });
    expect(validateArgs(schema, { container: 'web', rm: true })).toEqual({ ok: false, message: 'unknown argument "rm"' });
    expect(validateArgs(schema, JSON.parse('{"container":"web","__proto__":{"x":1}}'))).toMatchObject({ ok: false });
    expect(validateArgs(schema, ['web'])).toEqual({ ok: false, message: 'arguments must be an object' });
    expect(validateArgs(schema, { container: 'x'.repeat(200) })).toMatchObject({ ok: false, message: expect.stringContaining('exceeds 128') });
  });
});
