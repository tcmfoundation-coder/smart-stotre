import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ISSUER = 'Smart Store';
const RECOVERY_CODE_COUNT = 10;

export function generateTotpSecret(accountEmail: string): { base32Secret: string; otpauthUri: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    base32Secret: secret.base32,
    otpauthUri: totp.toString(),
  };
}

// window: 1 allows the token from one 30s step before/after the current one,
// tolerating minor clock drift between server and authenticator app.
export function verifyTotpCode(base32Secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const delta = OTPAuth.TOTP.validate({
    token,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    window: 1,
  });
  return delta !== null;
}

function generateRecoveryCode(): string {
  // 10 hex chars, formatted XXXXX-XXXXX for readability.
  const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 12)));
}

// Returns the index of the matching hash so the caller can remove it
// (each recovery code is single-use), or -1 if no code matched.
export async function findMatchingRecoveryCodeIndex(
  submittedCode: string,
  hashedCodes: string[]
): Promise<number> {
  const normalized = submittedCode.trim().toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) {
      return i;
    }
  }
  return -1;
}
