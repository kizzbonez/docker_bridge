import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { parseRecord, type ActivityRecord } from './record.ts';

const CURRENT = 'calls.jsonl';
const PREVIOUS = 'calls.1.jsonl';
/** The log rolls over at this size, keeping one older file: about 3,000 calls in all. */
const ROLL_AT_BYTES = 512 * 1024;
const MAX_READ_BYTES = 1024 * 1024;

type Env = Record<string, string | undefined>;

export interface ActivityLog {
  /**
   * Writes the record before returning, so it is on disk before the answer
   * to the call leaves: a client that ends the server straight after its last
   * call does not lose it. Never throws: a log that cannot be written is skipped.
   */
  append(record: ActivityRecord): void;
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

function sizeOf(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function write(dir: string, record: ActivityRecord): void {
  mkdirSync(dir, { recursive: true });
  const current = join(dir, CURRENT);
  if (sizeOf(current) > ROLL_AT_BYTES) renameSync(current, join(dir, PREVIOUS));
  appendFileSync(current, `${JSON.stringify(record)}\n`, { mode: 0o644 });
}

/** An append-only JSON-lines log. Pass null for a log that records nothing. */
export function createActivityLog(dir: string | null): ActivityLog {
  return {
    append(record) {
      if (dir === null) return;
      try {
        write(dir, record);
      } catch {
        // An unwritable log must never fail the call it describes.
      }
    },
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
