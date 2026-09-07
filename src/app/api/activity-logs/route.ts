import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import { escapeRegex } from '@/lib/utils';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  return withPermission('view_activity_logs')(async (req) => {
    try {
      await connectDB();

      const searchParams = req.nextUrl.searchParams;
      const action = searchParams.get('action') || 'all';
      const user = searchParams.get('user') || 'all';
      const search = searchParams.get('search') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200);

      const query: Record<string, unknown> = {};

      if (action !== 'all') {
        query.action = action;
      }

      if (user !== 'all') {
        query.userRole = user;
      }

      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { action: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
          { userName: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const logs = await ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const data = logs.map((log) => ({
        id: log._id.toString(),
        action: log.action,
        description: log.description,
        userId: log.userId?.toString(),
        userName: log.userName,
        userRole: log.userRole,
        ipAddress: log.ipAddress || 'unknown',
        severity: log.severity,
        timestamp: log.createdAt,
      }));

      return NextResponse.json({ success: true, data });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withPermission('view_activity_logs')(async (req, user) => {
    try {
      await connectDB();

      const data = await req.json();

      if (!data.action || !data.description) {
        return NextResponse.json(
          { success: false, error: 'action and description are required' },
          { status: 400 }
        );
      }

      const log = await ActivityLog.create({
        action: data.action,
        description: data.description,
        severity: data.severity || 'info',
        metadata: data.metadata,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        data: {
          id: log._id.toString(),
          action: log.action,
          description: log.description,
          userId: log.userId.toString(),
          userName: log.userName,
          userRole: log.userRole,
          ipAddress: log.ipAddress,
          severity: log.severity,
          timestamp: log.createdAt,
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
