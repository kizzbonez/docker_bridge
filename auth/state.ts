import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidHash } from './password.ts';

/** The single administrator account. Everything secret here is a hash, except the TOTP key. */
export interface Account {
  username: string;
  passwordHash: string;
  /** Base32 TOTP key. Must be recoverable to verify codes, so it is stored as is. */
  totpSecret: string;
  /** Highest time-step already accepted: codes at or below it are replays. */
  totpLastCounter: number;
  /** SHA-256 of each unused recovery code. */
  recoveryHashes: string[];
  createdAt: string;
  passwordChangedAt: string;
}

export interface StateStore {
  /** Null until onboarding has completed. */
  account(): Account | null;
  save(account: Account): Promise<void>;
  /** Factory reset: the next start runs onboarding again. */
  clear(): Promise<void>;
}

const FILE = 'account.json';

function isAccount(value: unknown): value is Account {
  const candidate = value as Partial<Account> | null;
  return (
    typeof candidate?.username === 'string' &&
    typeof candidate.passwordHash === 'string' &&
    isValidHash(candidate.passwordHash) &&
    typeof candidate.totpSecret === 'string' &&
    typeof candidate.totpLastCounter === 'number' &&
    Array.isArray(candidate.recoveryHashes)
  );
}

async function read(path: string): Promise<Account | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    return isAccount(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Account state cached in memory and written atomically (temp file + rename). */
export async function openStateStore(dataDir: string): Promise<StateStore> {
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, FILE);
  let current = await read(path);
  // Writes are chained so two requests can never interleave on disk.
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (task: () => Promise<void>): Promise<void> => {
    queue = queue.then(task, task);
    return queue;
  };

  return {
    account: () => current,
    save(account) {
      current = account;
      return enqueue(async () => {
        await writeFile(`${path}.tmp`, JSON.stringify(account), { mode: 0o600 });
        await rename(`${path}.tmp`, path);
      });
    },
    clear() {
      current = null;
      return enqueue(() => rm(path, { force: true }));
    },
  };
}
