import * as OTPAuth from 'otpauth';
import {
  generateTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  hashRecoveryCodes,
  findMatchingRecoveryCodeIndex,
} from '@/lib/mfa';

describe('generateTotpSecret', () => {
  it('produces a base32 secret and a matching otpauth:// URI', () => {
    const { base32Secret, otpauthUri } = generateTotpSecret('user@example.com');

    expect(base32Secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(otpauthUri).toContain('Smart%20Store');
    expect(otpauthUri).toContain(encodeURIComponent('user@example.com'));
  });
});

describe('verifyTotpCode', () => {
  it('accepts a code actually generated from the secret', () => {
    const { base32Secret } = generateTotpSecret('user@example.com');
    const validCode = OTPAuth.TOTP.generate({ secret: OTPAuth.Secret.fromBase32(base32Secret) });

    expect(verifyTotpCode(base32Secret, validCode)).toBe(true);
  });

  it('rejects a wrong code', () => {
    const { base32Secret } = generateTotpSecret('user@example.com');
    const validCode = OTPAuth.TOTP.generate({ secret: OTPAuth.Secret.fromBase32(base32Secret) });
    const wrongCode = validCode === '000000' ? '111111' : '000000';

    expect(verifyTotpCode(base32Secret, wrongCode)).toBe(false);
  });

  it('rejects non-6-digit input without touching the TOTP library', () => {
    const { base32Secret } = generateTotpSecret('user@example.com');
    expect(verifyTotpCode(base32Secret, 'not-a-code')).toBe(false);
    expect(verifyTotpCode(base32Secret, '12345')).toBe(false);
  });
});

describe('recovery codes', () => {
  it('generates 10 unique, formatted codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
    }
  });

  it('hashes codes so the plaintext is not recoverable, but still matches on verify', async () => {
    const codes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(codes);

    expect(hashed[0]).not.toBe(codes[0]);

    const matchIndex = await findMatchingRecoveryCodeIndex(codes[3], hashed);
    expect(matchIndex).toBe(3);
    // 10 bcrypt hashes at cost 12 (deliberately slow) can exceed Jest's 5s
    // default under a busy parallel test run, same reasoning as the sibling
    // "-1" test below.
  }, 20000);

  it('matching is case-insensitive (codes are uppercase, users may type lowercase)', async () => {
    const codes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(codes);

    const matchIndex = await findMatchingRecoveryCodeIndex(codes[0].toLowerCase(), hashed);
    expect(matchIndex).toBe(0);
  });

  it('returns -1 when no code matches', async () => {
    const codes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(codes);

    // Checks against every hash before concluding no match (bcrypt at cost
    // 12 is deliberately slow), so this needs more than Jest's 5s default.
    const matchIndex = await findMatchingRecoveryCodeIndex('AAAAA-AAAAA', hashed);
    expect(matchIndex).toBe(-1);
  }, 20000);
});
