import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/auth-rate-limit';
import { handleApiError } from '@/lib/error-handler';

// Disabling 2FA requires the account password (not the second factor being
// removed) - the same re-authentication pattern used for changing a
// password, so someone who has grabbed a live session can't silently strip
// 2FA off the account without knowing the password.
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const rateLimit = checkRateLimit(`2fa-disable:${user.id}`, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        );
      }

      await connectDB();

      const { password } = await req.json();
      if (!password) {
        return NextResponse.json({ success: false, error: 'Your password is required' }, { status: 400 });
      }

      const dbUser = await User.findById(user.id).select('+password');
      if (!dbUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const isMatch = await dbUser.comparePassword(password);
      if (!isMatch) {
        return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
      }

      dbUser.twoFactorEnabled = false;
      dbUser.twoFactorSecretEncrypted = undefined;
      dbUser.twoFactorRecoveryCodesHashed = undefined;
      dbUser.twoFactorEnabledAt = undefined;
      await dbUser.save();

      return NextResponse.json({ success: true, message: 'Two-factor authentication disabled' });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}
