import { appendFile, mkdir, open, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseRecord, type ActivityRecord } from './record.ts';

const CURRENT = 'calls.jsonl';
const PREVIOUS = 'calls.1.jsonl';
/** The log rolls over at this size, keeping one older file: about 3,000 calls in all. */
const ROLL_AT_BYTES = 512 * 1024;
const MAX_READ_BYTES = 1024 * 1024;

type Env = Record<string, string | undefined>;

export interface ActivityLog {
  /** Never throws and never delays a tool call: a log that cannot be written is skipped. */
  append(record: ActivityRecord): void;
  /** Resolves once everything appended so far is on disk. */
  flush(): Promise<void>;
}

/**
 * Where the log lives. `DOCKER_BRIDGE_ACTIVITY=off` disables it;
 * `DOCKER_BRIDGE_ACTIVITY_DIR` moves it.
 */
export function activityDirFrom(env: Env, fallback: string): string | null {
  if (/^(off|false|0|no)$/i.test((env.DOCKER_BRIDGE_ACTIVITY ?? '').trim())) return null;
  const chosen = (env.DOCKER_BRIDGE_ACTIVITY_DIR ?? '').trim();
  return chosen !== '' ? chosen : fallback;
}

async function write(dir: string, record: ActivityRecord): Promise<void> {
  await mkdir(dir, { recursive: true });
  const current = join(dir, CURRENT);
  const size = await stat(current).then(
    (info) => info.size,
    () => 0,
  );
  if (size > ROLL_AT_BYTES) await rename(current, join(dir, PREVIOUS));
  await appendFile(current, `${JSON.stringify(record)}\n`, { mode: 0o644 });
}

/** An append-only JSON-lines log. Pass null for a log that records nothing. */
export function createActivityLog(dir: string | null): ActivityLog {
  let queue: Promise<void> = Promise.resolve();
  return {
    append(record) {
      if (dir === null) return;
      // One write at a time, so lines never interleave; a failure is dropped.
      queue = queue.then(() => write(dir, record)).catch(() => undefined);
    },
    flush: () => queue,
  };
}

/** The last megabyte of a file as text, or nothing when it cannot be read. */
async function tail(path: string): Promise<string> {
  let handle;
  try {
    handle = await open(path, 'r');
    const { size } = await handle.stat();
    const length = Math.min(size, MAX_READ_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    return buffer.toString('utf8');
  } catch {
    return '';
  } finally {
    await handle?.close();
  }
}

/** The most recent `limit` calls, oldest first. Unreadable lines are skipped. */
export async function readActivity(dir: string, limit: number): Promise<ActivityRecord[]> {
  const text = `${await tail(join(dir, PREVIOUS))}\n${await tail(join(dir, CURRENT))}`;
  const records = text
    .split('\n')
    .map((line) => (line.trim() === '' ? null : parseRecord(line)))
    .filter((record): record is ActivityRecord => record !== null);
  return records.slice(-limit);
}
