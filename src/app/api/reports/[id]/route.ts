import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, UserRole } from '@/lib/rbac';
import connectDB from '@/lib/mongodb';
import { handleApiError } from '@/lib/error-handler';
import { Report } from '@/models';
import { REPORT_TYPE_PERMISSIONS, ReportType } from '../report-permissions';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const report = await Report.findById(id).lean();

      if (!report) {
        return NextResponse.json(
          { success: false, error: 'Report not found' },
          { status: 404 }
        );
      }

      // Same per-type permission as listing/generating/deleting - a role
      // that isn't allowed to see a report type shouldn't be able to open
      // its stored data via a direct link either.
      if (!hasPermission(user.role as UserRole, REPORT_TYPE_PERMISSIONS[report.type as ReportType])) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ...report,
          _id: report._id.toString(),
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
