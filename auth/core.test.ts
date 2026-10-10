// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createAuditLog } from './audit.ts';
import { createChallengeStore } from './challenges.ts';
import { consumeRecoveryCode, generateRecoveryCodes, hashCode, randomCode } from './codes.ts';
import { loadConfig } from './config.ts';
import { createLimiter } from './limiter.ts';
import { passwordIssues, passwordStrength } from './password-policy.ts';
import { hashPassword, isValidHash, verifyPassword } from './password.ts';
import { base32Decode, base32Encode, counterAt, generateSecret, hotp, otpauthUri, totpAt, verifyTotp } from './totp.ts';

const FAST = { logN: 10, r: 8, p: 1 };
// RFC 6238 Appendix B test key: ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('totp', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('matches the RFC 6238 SHA-1 vector at T=%i', (seconds, expected) => {
    expect(totpAt(RFC_SECRET, seconds * 1000)).toBe(expected);
  });

  it('matches the RFC 4226 HOTP vectors', () => {
    const key = Buffer.from('12345678901234567890');
    expect([0, 1, 2, 9].map((counter) => hotp(key, counter))).toEqual(['755224', '287082', '359152', '520489']);
  });

  it('round-trips base32 and rejects foreign characters', () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    expect(base32Decode('mzxw 6ytb-oi======').toString()).toBe('foobar');
    expect(() => base32Decode('abc1')).toThrow();
  });

  it('accepts one step of clock drift either way, and nothing further', () => {
    const now = 1_700_000_000_000;
    for (const drift of [-1, 0, 1]) {
      expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now, drift), now, -1)).toBe(counterAt(now) + drift);
    }
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now, 2), now, -1)).toBeNull();
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now, -2), now, -1)).toBeNull();
  });

  it('refuses a replayed code and malformed input', () => {
    const now = 1_700_000_000_000;
    const code = totpAt(RFC_SECRET, now);
    const counter = verifyTotp(RFC_SECRET, code, now, -1);
    expect(counter).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, code, now, counter ?? 0)).toBeNull();
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 456']) expect(verifyTotp(RFC_SECRET, bad, now, -1)).toBeNull();
  });

  it('builds an otpauth URI authenticator apps accept', () => {
    const uri = new URL(otpauthUri('DockerBridge', 'ops admin', 'JBSWY3DPEHPK3PXP'));
    expect(uri.protocol).toBe('otpauth:');
    expect(decodeURIComponent(uri.pathname)).toBe('/DockerBridge:ops admin');
    expect(Object.fromEntries(uri.searchParams)).toEqual({ secret: 'JBSWY3DPEHPK3PXP', issuer: 'DockerBridge', algorithm: 'SHA1', digits: '6', period: '30' });
  });
});

describe('passwords', () => {
  it('hashes with a random salt and verifies in constant time', async () => {
    const [first, second] = await Promise.all([hashPassword('violet-harbor-lantern', FAST), hashPassword('violet-harbor-lantern', FAST)]);
    expect(first).toMatch(/^scrypt\$10\$8\$1\$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain('violet');
    expect(await verifyPassword('violet-harbor-lantern', first)).toBe(true);
    expect(await verifyPassword('violet-harbor-lanterN', first)).toBe(false);
  });

  it('treats malformed hashes and absurd parameters as a mismatch', async () => {
    for (const bad of ['', 'plaintext', 'bcrypt$10$8$1$a$b', 'scrypt$99$8$1$c2FsdA$aGFzaA', 'scrypt$x$8$1$c2FsdA$aGFzaA']) {
      expect(isValidHash(bad)).toBe(false);
      expect(await verifyPassword('anything-at-all', bad)).toBe(false);
    }
    expect(await verifyPassword('x'.repeat(257), await hashPassword('secret-secret-1', FAST))).toBe(false);
  });

  it('uses OWASP-strength parameters by default', () => {
    expect(loadConfig({}).scrypt).toEqual({ logN: 15, r: 8, p: 3 });
  });

  it('enforces length and a blocklist, not character classes', () => {
    expect(passwordIssues('correct horse battery', 'admin')).toEqual([]);
    expect(passwordIssues('short', 'admin')).toContain('too_short');
    expect(passwordIssues('aaaaaaaaaaaaaa', 'admin')).toEqual(expect.arrayContaining(['low_variety', 'too_common']));
    expect(passwordIssues('Password-1234', 'admin')).toContain('too_common');
    expect(passwordIssues('my-Operator-login-9', 'operator')).toContain('contains_username');
    expect(passwordIssues('x'.repeat(300), 'admin')).toContain('too_long');
  });

  it('rates strength only once the policy passes', () => {
    expect(passwordStrength('', 'admin')).toBe(0);
    expect(passwordStrength('password1234', 'admin')).toBe(1);
    expect(passwordStrength('violetharborx', 'admin')).toBe(2);
    expect(passwordStrength('Violet-Harbor-Lantern-42!', 'admin')).toBe(4);
  });
});

describe('recovery codes', () => {
  it('generates ten unambiguous codes and stores only hashes', () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-TV-Z2-9]{5}-[A-HJKMNP-TV-Z2-9]{5}$/);
    expect(hashes.join()).not.toContain(codes[0]);
    expect(randomCode(4).split('-')).toHaveLength(4);
  });

  it('spends a code exactly once, forgiving case, spaces and dashes', () => {
    const { codes, hashes } = generateRecoveryCodes();
    const typed = (codes[3] ?? '').toLowerCase().replace('-', ' ');
    const remaining = consumeRecoveryCode(hashes, typed);
    expect(remaining).toHaveLength(9);
    expect(consumeRecoveryCode(remaining ?? [], typed)).toBeNull();
    expect(consumeRecoveryCode(hashes, 'AAAAA-AAAAA')).toBeNull();
    expect(hashCode('abcde-fghjk')).toBe(hashCode('ABCDE FGHJK'));
  });
});

describe('limiter, challenges and audit log', () => {
  it('locks a key after repeated failures and releases it after the lockout', () => {
    let time = 0;
    const limiter = createLimiter({ maxFailures: 3, lockoutMs: 60_000, now: () => time });
    limiter.fail('k');
    limiter.fail('k');
    expect(limiter.retryAfter('k')).toBe(0);
    limiter.fail('k');
    expect(limiter.retryAfter('k')).toBe(60);
    expect(limiter.retryAfter('other')).toBe(0);
    time += 60_000;
    expect(limiter.retryAfter('k')).toBe(0);
    limiter.fail('k');
    limiter.succeed('k');
    limiter.fail('k');
    limiter.fail('k');
    expect(limiter.retryAfter('k')).toBe(0);
  });

  it('bounds the number of tracked keys', () => {
    const limiter = createLimiter({ maxFailures: 1, lockoutMs: 60_000, maxKeys: 3, now: () => 0 });
    for (const key of ['a', 'b', 'c', 'd']) limiter.fail(key);
    expect(limiter.retryAfter('a')).toBe(0);
    expect(limiter.retryAfter('d')).toBe(60);
  });

  it('expires challenges and caps second-factor guesses', () => {
    let time = 0;
    const challenges = createChallengeStore({ ttlMs: 1000, maxAttempts: 2, now: () => time });
    const token = challenges.issue({ user: 'u', ip: '1.1.1.1' });
    expect(challenges.attempt(token)).toEqual({ user: 'u', ip: '1.1.1.1' });
    expect(challenges.attempt(token)).not.toBeNull();
    expect(challenges.attempt(token)).toBeNull();
    const late = challenges.issue({ user: 'u', ip: '1.1.1.1' });
    time += 1001;
    expect(challenges.attempt(late)).toBeNull();
    expect(challenges.attempt('never-issued')).toBeNull();
  });

  it('keeps a bounded, newest-first log and neutralises control characters', () => {
    const lines: string[] = [];
    const audit = createAuditLog({ capacity: 2, now: () => 0, sink: (line) => lines.push(line) });
    audit.record('login_failure', '10.0.0.1', 'eve\n{"audit":true,"type":"login_success"}');
    audit.record('login_success', '10.0.0.1', 'operator');
    audit.record('logout', '10.0.0.1');
    expect(audit.recent().map((event) => event.type)).toEqual(['logout', 'login_success']);
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => !line.includes('\n'))).toBe(true);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ type: 'login_failure', detail: expect.stringContaining('eve{') });
  });
});
