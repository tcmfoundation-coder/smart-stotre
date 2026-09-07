import crypto from 'crypto';
import { AppError } from '@/lib/error-handler';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

// TOTP secrets are stored encrypted at rest, keyed by MFA_ENCRYPTION_KEY (a
// server-only secret, never sent to the client). This intentionally throws
// rather than falling back to a default key - a 2FA secret encrypted with a
// guessable key is worse than not encrypting it at all. Thrown as an
// operational AppError (503) so handleApiError surfaces this exact message
// to whoever is trying to use 2FA even in production - it's a deployment
// configuration problem the caller needs to see and act on, not a bug to
// mask behind a generic "unexpected error" (handleApiError only shows the
// real message for AppError; other errors are genericized in production).
function getKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw) {
    throw new AppError('MFA is not configured on this server: MFA_ENCRYPTION_KEY is not set.', 503, true);
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new AppError('MFA_ENCRYPTION_KEY must decode to exactly 32 bytes (a base64-encoded 256-bit key).', 503, true);
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv.authTag.ciphertext, all base64 - self-contained so decryption never
  // needs anything beyond the key and this one stored string.
  return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, authTagB64, dataB64] = payload.split('.');
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Malformed encrypted MFA secret');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
