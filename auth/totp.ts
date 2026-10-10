import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 6238 TOTP with the parameters every authenticator app supports. */
export const STEP_SECONDS = 30;
export const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    out += ALPHABET.charAt(Number.parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2));
  }
  return out;
}

export function base32Decode(text: string): Buffer {
  let bits = '';
  for (const char of text.toUpperCase().replace(/[\s=-]/g, '')) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('invalid base32 character');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** 160 bits, the size RFC 4226 recommends for HMAC-SHA1. */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP: HMAC-SHA1, dynamic truncation, 6 digits. */
export function hotp(secret: Uint8Array, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', secret).update(message).digest();
  const offset = (mac[mac.length - 1] ?? 0) & 0x0f;
  const binary = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

export const counterAt = (timeMs: number): number => Math.floor(timeMs / 1000 / STEP_SECONDS);

export function totpAt(secretBase32: string, timeMs: number, drift = 0): string {
  return hotp(base32Decode(secretBase32), counterAt(timeMs) + drift);
}

const sameCode = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Accepts the current step and one either side (clock drift). Returns the
 * matched counter, or null. A counter at or below `lastCounter` is refused,
 * so an intercepted code cannot be replayed.
 */
export function verifyTotp(secretBase32: string, code: string, timeMs: number, lastCounter: number): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const current = counterAt(timeMs);
  let matched: number | null = null;
  for (const counter of [current - 1, current, current + 1]) {
    // No early exit: every candidate is compared, keeping timing uniform.
    if (sameCode(hotp(secret, counter), code) && counter > lastCounter) matched = counter;
  }
  return matched;
}

/** The URI an authenticator app reads from a QR code. */
export function otpauthUri(issuer: string, account: string, secretBase32: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const query = new URLSearchParams({ secret: secretBase32, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${query.toString()}`;
}
