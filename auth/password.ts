import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { MAX_PASSWORD_LENGTH } from './password-policy.ts';

export interface ScryptParams {
  /** log2 of the CPU/memory cost N. */
  logN: number;
  r: number;
  p: number;
}

/** OWASP password-storage guidance for scrypt: N=2^15, r=8, p=3 (~32 MiB per hash). */
export const DEFAULT_PARAMS: ScryptParams = { logN: 15, r: 8, p: 3 };

const KEY_BYTES = 32;
const SALT_BYTES = 16;
const MAX_MEMORY = 128 * 1024 * 1024;
const MAX_LOG_N = 20;

function derive(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  const options = { N: 2 ** params.logN, r: params.r, p: params.p, maxmem: MAX_MEMORY };
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, KEY_BYTES, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Encodes as `scrypt$logN$r$p$salt$hash` (base64url), so parameters can evolve. */
export async function hashPassword(password: string, params: ScryptParams = DEFAULT_PARAMS): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, params);
  return ['scrypt', params.logN, params.r, params.p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

interface Parsed {
  params: ScryptParams;
  salt: Buffer;
  key: Buffer;
}

function parse(encoded: string): Parsed | null {
  const [scheme, logN, r, p, salt, key] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return null;
  const params = { logN: Number(logN), r: Number(r), p: Number(p) };
  const sane = [params.logN, params.r, params.p].every((n) => Number.isInteger(n) && n > 0) && params.logN <= MAX_LOG_N;
  return sane ? { params, salt: Buffer.from(salt, 'base64url'), key: Buffer.from(key, 'base64url') } : null;
}

export function isValidHash(encoded: string): boolean {
  return parse(encoded) !== null;
}

/** Constant-time comparison; a malformed hash or over-long password is simply "no". */
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parsed = parse(encoded);
  if (!parsed || password.length > MAX_PASSWORD_LENGTH) return false;
  const candidate = await derive(password, parsed.salt, parsed.params);
  return candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
}
