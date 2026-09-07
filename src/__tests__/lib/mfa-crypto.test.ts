import crypto from 'crypto';
import { encryptSecret, decryptSecret } from '@/lib/mfa-crypto';

const ORIGINAL_KEY = process.env.MFA_ENCRYPTION_KEY;

describe('mfa-crypto', () => {
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.MFA_ENCRYPTION_KEY;
    } else {
      process.env.MFA_ENCRYPTION_KEY = ORIGINAL_KEY;
    }
  });

  it('round-trips a secret through encrypt/decrypt', () => {
    process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

    const plaintext = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV) for the same plaintext', () => {
    process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

    const plaintext = 'JBSWY3DPEHPK3PXP';
    expect(encryptSecret(plaintext)).not.toBe(encryptSecret(plaintext));
  });

  it('throws a clear error instead of encrypting with no key configured', () => {
    delete process.env.MFA_ENCRYPTION_KEY;
    expect(() => encryptSecret('secret')).toThrow('MFA is not configured');
  });

  it('throws when the configured key is not a valid 32-byte base64 value', () => {
    process.env.MFA_ENCRYPTION_KEY = 'too-short';
    expect(() => encryptSecret('secret')).toThrow('32 bytes');
  });

  it('fails to decrypt with the wrong key rather than silently returning garbage', () => {
    process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    const encrypted = encryptSecret('JBSWY3DPEHPK3PXP');

    process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
