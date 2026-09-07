import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateTotpSecret } from '@/lib/mfa';
import { encryptSecret } from '@/lib/mfa-crypto';
import { handleApiError } from '@/lib/error-handler';
import QRCode from 'qrcode';

// Starts (or restarts) 2FA setup for the current user: generates a new TOTP
// secret and stores it encrypted, but does NOT enable 2FA yet - that only
// happens once the user proves they can generate a valid code from it, via
// POST /api/auth/2fa/enable. The plaintext secret/QR are only ever returned
// from this one response, matching how every other TOTP setup flow works
// (Google, GitHub, etc.) - the user must see it once to add it to their app.
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const dbUser = await User.findById(user.id);
      if (!dbUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      if (dbUser.twoFactorEnabled) {
        return NextResponse.json(
          { success: false, error: '2FA is already enabled. Disable it first to set up a new device.' },
          { status: 400 }
        );
      }

      const { base32Secret, otpauthUri } = generateTotpSecret(dbUser.email);

      dbUser.twoFactorSecretEncrypted = encryptSecret(base32Secret);
      await dbUser.save();

      const qrDataUrl = await QRCode.toDataURL(otpauthUri);

      return NextResponse.json({
        success: true,
        data: {
          secret: base32Secret,
          otpauthUri,
          qrDataUrl,
        },
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
