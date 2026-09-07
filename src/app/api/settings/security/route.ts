import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit } from '@/lib/auth-rate-limit';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const { currentPassword, newPassword } = await req.json();

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password and new password are required' },
          { status: 400 }
        );
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }

      const rateLimit = checkRateLimit(`password-change:${user.id}`, 5, 15 * 60 * 1000);
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        );
      }

      await connectDB();
      const dbUser = await User.findById(user.id);
      if (!dbUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const isMatch = await dbUser.comparePassword(currentPassword);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      dbUser.password = newPassword;
      await dbUser.save();

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}
