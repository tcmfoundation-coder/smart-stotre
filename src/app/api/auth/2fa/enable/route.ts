import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyTotpCode, generateRecoveryCodes, hashRecoveryCodes } from '@/lib/mfa';
import { decryptSecret } from '@/lib/mfa-crypto';
import { checkRateLimit } from '@/lib/auth-rate-limit';
import { handleApiError } from '@/lib/error-handler';

// Confirms setup by requiring one real code from the authenticator app before
// flipping twoFactorEnabled on - this proves the user actually captured the
// secret correctly, rather than trusting that the QR scan succeeded.
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const rateLimit = checkRateLimit(`2fa-enable:${user.id}`, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        );
      }

      await connectDB();

      const { code } = await req.json();
      if (!code) {
        return NextResponse.json({ success: false, error: 'A verification code is required' }, { status: 400 });
      }

      const dbUser = await User.findById(user.id).select('+twoFactorSecretEncrypted');
      if (!dbUser || !dbUser.twoFactorSecretEncrypted) {
        return NextResponse.json(
          { success: false, error: 'No pending 2FA setup found. Start setup again.' },
          { status: 400 }
        );
      }

      const secret = decryptSecret(dbUser.twoFactorSecretEncrypted);
      if (!verifyTotpCode(secret, code)) {
        return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 });
      }

      const recoveryCodes = generateRecoveryCodes();
      dbUser.twoFactorRecoveryCodesHashed = await hashRecoveryCodes(recoveryCodes);
      dbUser.twoFactorEnabled = true;
      dbUser.twoFactorEnabledAt = new Date();
      await dbUser.save();

      return NextResponse.json({
        success: true,
        data: { recoveryCodes },
        message: 'Two-factor authentication enabled',
      });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}
