import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { UserActivity } from '@/models';

export async function GET(request: NextRequest) {
  return withAdmin(async (req) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const minutesThreshold = parseInt(searchParams.get('minutes') || '5');

      // Get active users
      const activeUsers = await UserActivity.getActiveUsers(minutesThreshold);

      return NextResponse.json({
        success: true,
        data: activeUsers,
        count: activeUsers.length
      });
    } catch (error: any) {
      console.error('Get active users error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch active users'
      }, { status: 500 });
    }
  })(request);
}
