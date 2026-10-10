import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

// No 0/O, 1/I/L or U: codes get read off a screen and typed by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
export const RECOVERY_CODE_COUNT = 10;

/** `groups` dash-separated groups of five characters, ~4.9 bits per character. */
export function randomCode(groups: number): string {
  const group = (): string => Array.from({ length: 5 }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join('');
  return Array.from({ length: groups }, group).join('-');
}

/** Case, spaces and dashes are forgiven on input. */
export const normalizeCode = (code: string): string => code.toUpperCase().replace(/[\s-]/g, '');

// Codes are high-entropy random strings, so a fast hash is the right tool here.
export const hashCode = (code: string): string => createHash('sha256').update(normalizeCode(code)).digest('hex');

export function sameSecret(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

/** Ten single-use codes (~49 bits each) and the hashes to store for them. */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => randomCode(2));
  return { codes, hashes: codes.map(hashCode) };
}

/** Returns the hashes that remain after spending `code`, or null when it is not valid. */
export function consumeRecoveryCode(hashes: string[], code: string): string[] | null {
  const candidate = hashCode(code);
  let found = -1;
  hashes.forEach((hash, index) => {
    if (sameSecret(hash, candidate)) found = index;
  });
  return found < 0 ? null : hashes.filter((_, index) => index !== found);
}
