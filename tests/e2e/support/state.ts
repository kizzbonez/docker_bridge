import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { counterAt, totpAt } from '../../../auth/totp.ts';

/** Scratch files shared between Playwright projects. Git-ignored. */
export const STATE_DIR = fileURLToPath(new URL('../.state/', import.meta.url));
export const STORAGE_FILE = `${STATE_DIR}session.json`;
const STACK_FILE = `${STATE_DIR}stack.json`;
const ADMIN_FILE = `${STATE_DIR}admin.json`;

export const E2E_PROJECT = 'docker-bridge-e2e';
export const E2E_PORT = Number(process.env.E2E_PORT ?? 8743);
export const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;
export const ANONYMOUS = { cookies: [], origins: [] };

export interface Stack {
  baseUrl: string;
  setupToken: string;
}

/** What the administrator walks away from onboarding with. */
export interface Admin {
  username: string;
  password: string;
  totpSecret: string;
  recoveryCodes: string[];
  /** Highest TOTP time-step already spent, mirroring the server's replay guard. */
  lastCounter: number;
}

function write(path: string, value: unknown): void {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export const writeStack = (stack: Stack): void => write(STACK_FILE, stack);
export const readStack = (): Stack => read<Stack>(STACK_FILE);
export const writeAdmin = (admin: Admin): void => write(ADMIN_FILE, admin);
export const readAdmin = (): Admin => read<Admin>(ADMIN_FILE);

const STEP_MS = 30_000;

/**
 * A code the server has not seen yet. The server accepts the current step
 * and the next one, so two sign-ins fit in one 30 s window; a third waits.
 */
export async function freshCode(): Promise<string> {
  const admin = readAdmin();
  const wanted = Math.max(counterAt(Date.now()), admin.lastCounter + 1);
  const behind = wanted - counterAt(Date.now()) - 1;
  if (behind > 0) await new Promise((resolve) => setTimeout(resolve, behind * STEP_MS + 500));
  writeAdmin({ ...admin, lastCounter: wanted });
  return totpAt(admin.totpSecret, wanted * STEP_MS);
}

/** Spends one single-use recovery code. */
export function takeRecoveryCode(): string {
  const admin = readAdmin();
  const [code, ...rest] = admin.recoveryCodes;
  if (!code) throw new Error('no recovery codes left for the e2e run');
  writeAdmin({ ...admin, recoveryCodes: rest });
  return code;
}
