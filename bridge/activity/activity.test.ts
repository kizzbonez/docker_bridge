// @vitest-environment node
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CallReport } from '../tools/call.ts';
import { activityDirFrom, createActivityLog, readActivity } from './log.ts';
import { clientLabel, parseRecord, toRecord, type ActivityRecord } from './record.ts';
import { summarize } from './summary.ts';

const AT = new Date('2026-10-10T12:00:00Z');

const result = (tool: string, args: CallReport['args'], structured: Record<string, unknown>, isError = false): CallReport => ({
  tool,
  args,
  outcome: { kind: 'result', structured, isError },
  ms: 42,
});

const record = (overrides: Partial<ActivityRecord> = {}): ActivityRecord => ({
  at: AT.toISOString(),
  client: 'cursor 1.9',
  tool: 'docker_tail_filtered_logs',
  target: 'shop/web',
  detail: 'error',
  outcome: 'ok',
  ms: 12,
  tokens: { raw: 4000, returned: 300 },
  ...overrides,
});

describe('toRecord', () => {
  it('keeps who, what and how it went for a log tail, with both token counts', () => {
    const report = result('docker_tail_filtered_logs', { container: 'web', project: 'shop', filter_pattern: 'error|502' }, { tokens: { raw_tail: 18400, returned: 320 }, lines: [] });
    expect(toRecord(report, 'claude-code 2.1.0', AT)).toMatchObject({
      at: '2026-10-10T12:00:00.000Z',
      client: 'claude-code 2.1.0',
      target: 'shop/web',
      detail: 'error|502',
      outcome: 'ok',
      ms: 42,
      tokens: { raw: 18400 },
    });
  });

  it('tells a refusal from a failure from a bad request', () => {
    const refused = result('docker_safe_exec', { container: 'db', command: 'rm -rf /' }, { allowed: false }, true);
    const failed = result('docker_get_stack_topology', { project: 'shop' }, { error: 'no containers found' }, true);
    const invalid: CallReport = { tool: 'docker_safe_exec', args: null, outcome: { kind: 'invalid', message: 'bad' }, ms: 1 };
    expect(toRecord(refused, 'x', AT)).toMatchObject({ outcome: 'refused', target: 'db', detail: 'rm -rf /', tokens: { raw: null } });
    expect(toRecord(failed, 'x', AT)).toMatchObject({ outcome: 'error', target: 'shop' });
    expect(toRecord(invalid, 'x', AT)).toMatchObject({ outcome: 'invalid', target: '', tokens: { raw: null, returned: 0 } });
  });

  it('never stores what the tool returned', () => {
    const report = result('docker_safe_exec', { container: 'db', command: 'env' }, { allowed: true, stdout: 'PGPASSWORD=hunter2' });
    expect(JSON.stringify(toRecord(report, 'x', AT))).not.toContain('hunter2');
  });

  it('clips long commands and strips control characters', () => {
    const command = `ls ${'a'.repeat(400)}\u0007\nrm`;
    const stored = toRecord(result('docker_safe_exec', { container: 'db', command }, { allowed: true }), 'x', AT);
    expect(stored.detail).toHaveLength(160);
    expect([...stored.detail].every((char) => char >= ' ')).toBe(true);
  });
});

describe('clientLabel', () => {
  it('joins name and version, and falls back when the client says nothing', () => {
    expect(clientLabel({ name: 'cursor', version: '1.9.2' })).toBe('cursor 1.9.2');
    expect(clientLabel({ name: 'codex' })).toBe('codex');
    for (const nothing of [null, undefined, 'x', {}, { name: 42 }, { name: '  ' }]) expect(clientLabel(nothing)).toBe('unknown client');
  });

  it('bounds what a client can put in the log', () => {
    expect(clientLabel({ name: 'n'.repeat(500), version: 'v'.repeat(500) }).length).toBeLessThanOrEqual(60);
    expect(clientLabel({ name: 'evil\u001b[31m\r\nname' })).toBe('evil[31mname');
  });
});

describe('parseRecord', () => {
  it('reads back what toRecord wrote', () => {
    const written = record();
    expect(parseRecord(JSON.stringify(written))).toEqual(written);
  });

  it('drops lines that are not records', () => {
    const junk = ['', 'not json', '[]', 'null', '{}', JSON.stringify({ ...record(), outcome: 'pwned' }), JSON.stringify({ ...record(), at: 'yesterday' }), JSON.stringify({ ...record(), tool: '' })];
    for (const line of junk) expect(parseRecord(line), line).toBeNull();
  });

  it('re-checks every field of a line that was edited by hand', () => {
    const edited = { ...record(), client: 'c'.repeat(900), detail: 'd'.repeat(900), ms: -5, tokens: { raw: 'lots', returned: 1.6 }, extra: '<script>' };
    const parsed = parseRecord(JSON.stringify(edited));
    expect(parsed?.client).toHaveLength(60);
    expect(parsed?.detail).toHaveLength(160);
    expect(parsed).toMatchObject({ ms: 0, tokens: { raw: null, returned: 2 } });
    expect(parsed).not.toHaveProperty('extra');
  });
});

describe('the log on disk', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dockerbridge-activity-test-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('has the record on disk by the time append returns', () => {
    createActivityLog(dir).append(record({ ms: 7 }));
    expect(readFileSync(join(dir, 'calls.jsonl'), 'utf8')).toContain('"ms":7');
  });

  it('appends one line per call and reads the most recent back, oldest first', async () => {
    const log = createActivityLog(join(dir, 'nested'));
    for (let index = 0; index < 5; index += 1) log.append(record({ ms: index }));
    const lines = (await readFile(join(dir, 'nested', 'calls.jsonl'), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(5);
    expect((await readActivity(join(dir, 'nested'), 3)).map((entry) => entry.ms)).toEqual([2, 3, 4]);
  });

  it('rolls over when the file grows, and still reads across both files', async () => {
    await writeFile(join(dir, 'calls.jsonl'), `${JSON.stringify(record({ ms: 1 }))}\n${' '.repeat(600 * 1024)}\n`);
    const log = createActivityLog(dir);
    log.append(record({ ms: 2 }));
    expect((await readFile(join(dir, 'calls.jsonl'), 'utf8')).trim().split('\n')).toHaveLength(1);
    expect((await readActivity(dir, 10)).map((entry) => entry.ms)).toEqual([1, 2]);
  });

  it('skips lines it cannot read and survives a missing folder', async () => {
    await writeFile(join(dir, 'calls.jsonl'), `garbage\n${JSON.stringify(record())}\n{"half":\n`);
    expect(await readActivity(dir, 10)).toHaveLength(1);
    expect(await readActivity(join(dir, 'missing'), 10)).toEqual([]);
  });

  it('writes nothing when disabled, and never throws when it cannot write', async () => {
    const off = createActivityLog(null);
    off.append(record());
    expect(await readActivity(dir, 10)).toEqual([]);

    // A file where the folder should be: every write fails.
    await writeFile(join(dir, 'blocked'), 'x');
    const blocked = createActivityLog(join(dir, 'blocked'));
    expect(() => blocked.append(record())).not.toThrow();
  });

  it('is on by default, and can be moved or switched off', () => {
    expect(activityDirFrom({}, '/repo/data/activity')).toBe('/repo/data/activity');
    expect(activityDirFrom({ DOCKER_BRIDGE_ACTIVITY_DIR: ' /var/log/bridge ' }, '/x')).toBe('/var/log/bridge');
    for (const off of ['off', 'OFF', 'false', '0', 'no']) expect(activityDirFrom({ DOCKER_BRIDGE_ACTIVITY: off }, '/x')).toBeNull();
    expect(activityDirFrom({ DOCKER_BRIDGE_ACTIVITY: 'on' }, '/x')).toBe('/x');
  });
});

describe('summarize', () => {
  it('counts calls and outcomes, and adds up tokens for log tails only', () => {
    const totals = summarize([
      record({ at: '2026-10-10T10:00:00.000Z', client: 'cursor 1.9' }),
      record({ at: '2026-10-10T11:00:00.000Z', client: 'claude-code 2.1', tokens: { raw: 100, returned: 250 } }),
      record({ at: '2026-10-10T09:00:00.000Z', tool: 'docker_safe_exec', outcome: 'refused', tokens: { raw: null, returned: 40 } }),
      record({ at: '2026-10-10T08:00:00.000Z', outcome: 'error', tokens: { raw: null, returned: 10 } }),
      record({ at: '2026-10-10T07:00:00.000Z', outcome: 'invalid', tokens: { raw: null, returned: 0 } }),
    ]);
    expect(totals).toEqual({
      calls: 5,
      refused: 1,
      failed: 2,
      // A tail that came back larger than it went in saves nothing; it never counts as negative.
      tokens: { raw: 4100, returned: 550, saved: 3700 },
      clients: ['claude-code 2.1', 'cursor 1.9'],
    });
  });

  it('is all zeroes for an empty log', () => {
    expect(summarize([])).toEqual({ calls: 0, refused: 0, failed: 0, tokens: { raw: 0, returned: 0, saved: 0 }, clients: [] });
  });
});
