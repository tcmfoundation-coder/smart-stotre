import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST as setupTwoFactor } from '@/app/api/auth/2fa/setup/route';
import { POST as enableTwoFactor } from '@/app/api/auth/2fa/enable/route';
import { POST as disableTwoFactor } from '@/app/api/auth/2fa/disable/route';
import { GET as statusTwoFactor } from '@/app/api/auth/2fa/status/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { generateTotpSecret, verifyTotpCode } from '@/lib/mfa';
import { encryptSecret } from '@/lib/mfa-crypto';
import * as OTPAuth from 'otpauth';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

const ORIGINAL_KEY = process.env.MFA_ENCRYPTION_KEY;

// @types/node marks NODE_ENV as read-only; this test needs to flip it to
// verify production behavior specifically.
function setNodeEnv(value: string | undefined) {
  (process.env as { NODE_ENV?: string }).NODE_ENV = value;
}

function mockSession() {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role: 'cashier', name: 'Test User' },
  });
}

function mockDbUserForAuth() {
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }),
  });
}

describe('2FA API routes', () => {
  beforeAll(() => {
    process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  });

  afterAll(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.MFA_ENCRYPTION_KEY;
    } else {
      process.env.MFA_ENCRYPTION_KEY = ORIGINAL_KEY;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession();
  });

  describe('POST /api/auth/2fa/setup', () => {
    it('generates and stores an encrypted secret, returning a QR + manual secret', async () => {
      mockDbUserForAuth();
      const dbUser: { email: string; twoFactorEnabled: boolean; twoFactorSecretEncrypted?: string; save: jest.Mock } = {
        email: 'user@example.com',
        twoFactorEnabled: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce(Promise.resolve(dbUser));

      const request = new NextRequest('http://localhost/api/auth/2fa/setup', { method: 'POST' });
      const response = await setupTwoFactor(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.secret).toMatch(/^[A-Z2-7]+=*$/);
      expect(payload.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(dbUser.twoFactorSecretEncrypted).toBeDefined();
      expect(dbUser.save).toHaveBeenCalledTimes(1);
    });

    it('refuses to restart setup while 2FA is already enabled', async () => {
      mockDbUserForAuth();
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce(Promise.resolve({ twoFactorEnabled: true }));

      const request = new NextRequest('http://localhost/api/auth/2fa/setup', { method: 'POST' });
      const response = await setupTwoFactor(request);

      expect(response.status).toBe(400);
    });

    it('surfaces a clear config error - even in production - when MFA_ENCRYPTION_KEY is unset', async () => {
      mockDbUserForAuth();
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce(Promise.resolve({ email: 'user@example.com', twoFactorEnabled: false, save: jest.fn() }));

      const originalEnv = process.env.NODE_ENV;
      delete process.env.MFA_ENCRYPTION_KEY;
      setNodeEnv('production');
      try {
        const request = new NextRequest('http://localhost/api/auth/2fa/setup', { method: 'POST' });
        const response = await setupTwoFactor(request);
        const payload = await response.json();

        // This is an operational AppError, so handleApiError must show the
        // real message even in production - a generic "unexpected error"
        // would leave whoever hit this with no way to know the server is
        // simply missing MFA_ENCRYPTION_KEY.
        expect(response.status).toBe(503);
        expect(payload.error).toMatch(/MFA_ENCRYPTION_KEY is not set/);
      } finally {
        process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
        setNodeEnv(originalEnv);
      }
    });
  });

  describe('POST /api/auth/2fa/enable', () => {
    it('enables 2FA and returns recovery codes when the code is valid', async () => {
      mockDbUserForAuth();
      const { base32Secret } = generateTotpSecret('user@example.com');
      const validCode = OTPAuth.TOTP.generate({ secret: OTPAuth.Secret.fromBase32(base32Secret) });
      const dbUser: {
        twoFactorSecretEncrypted?: string;
        twoFactorEnabled?: boolean;
        twoFactorEnabledAt?: Date;
        twoFactorRecoveryCodesHashed?: string[];
        save: jest.Mock;
      } = {
        twoFactorSecretEncrypted: encryptSecret(base32Secret),
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(dbUser) });

      const request = new NextRequest('http://localhost/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: validCode }),
      });
      const response = await enableTwoFactor(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.recoveryCodes).toHaveLength(10);
      expect(dbUser.twoFactorEnabled).toBe(true);
    }, 15000);

    it('rejects an invalid code and does not enable 2FA', async () => {
      mockDbUserForAuth();
      const { base32Secret } = generateTotpSecret('user@example.com');
      const dbUser = {
        twoFactorSecretEncrypted: encryptSecret(base32Secret),
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(dbUser) });

      const request = new NextRequest('http://localhost/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: '000000' }),
      });
      const response = await enableTwoFactor(request);

      expect(response.status).toBe(400);
      expect(dbUser.save).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/2fa/disable', () => {
    it('disables 2FA when the password is correct', async () => {
      mockDbUserForAuth();
      const dbUser = {
        comparePassword: jest.fn().mockResolvedValue(true),
        twoFactorEnabled: true,
        twoFactorSecretEncrypted: 'x',
        twoFactorRecoveryCodesHashed: ['x'],
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(dbUser) });

      const request = new NextRequest('http://localhost/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: 'correct-password' }),
      });
      const response = await disableTwoFactor(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(dbUser.twoFactorEnabled).toBe(false);
      expect(dbUser.twoFactorSecretEncrypted).toBeUndefined();
    });

    it('rejects an incorrect password and leaves 2FA enabled', async () => {
      mockDbUserForAuth();
      const dbUser = {
        comparePassword: jest.fn().mockResolvedValue(false),
        twoFactorEnabled: true,
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(dbUser) });

      const request = new NextRequest('http://localhost/api/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong-password' }),
      });
      const response = await disableTwoFactor(request);

      expect(response.status).toBe(401);
      expect(dbUser.twoFactorEnabled).toBe(true);
      expect(dbUser.save).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/2fa/status', () => {
    it('reports whether 2FA is enabled for the current user', async () => {
      mockDbUserForAuth();
      (User.findById as jest.Mock)
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
        .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ twoFactorEnabled: true, twoFactorEnabledAt: new Date() }) });

      const request = new NextRequest('http://localhost/api/auth/2fa/status');
      const response = await statusTwoFactor(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.data.enabled).toBe(true);
    });
  });
});

// Sanity check that the module under test actually exercises real
// verification, not a stub - guards against the enable-route test above
// passing for the wrong reason.
describe('verifyTotpCode sanity', () => {
  it('is the real implementation, not mocked', () => {
    const { base32Secret } = generateTotpSecret('sanity@example.com');
    expect(verifyTotpCode(base32Secret, '000000')).toBe(false);
  });
});
