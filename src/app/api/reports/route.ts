import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withAuth } from '@/lib/api-auth';
import { hasPermission, UserRole } from '@/lib/rbac';
import connectDB from '@/lib/mongodb';
import { handleApiError } from '@/lib/error-handler';
import { Report } from '@/models';
import { ALL_REPORT_TYPES, REPORT_TYPE_PERMISSIONS, ReportType } from './report-permissions';

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type') || '';
      const status = searchParams.get('status') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      // A generated report's `metadata` can contain real revenue/expense/
      // profit figures, so listing is scoped by the same per-type
      // permission that gates generating and viewing that type elsewhere -
      // without this, any authenticated role could list every report
      // ever generated, including other users' financial reports.
      const allowedTypes = ALL_REPORT_TYPES.filter((t) => hasPermission(user.role as UserRole, REPORT_TYPE_PERMISSIONS[t]));

      if (type) {
        if (!allowedTypes.includes(type as ReportType)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          );
        }
      } else if (allowedTypes.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        });
      }

      const query: any = { type: type ? type : { $in: allowedTypes } };

      if (status) query.status = status;

      const reports = await Report
        .find(query)
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      const total = await Report.countDocuments(query);
      
      return NextResponse.json({
        success: true,
        data: reports.map(report => ({
          ...report,
          _id: report._id.toString(),
          generatedAt: report.generatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
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

export async function DELETE(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();
      
      const { searchParams } = new URL(request.url);
      const reportId = searchParams.get('id');
      
      if (!reportId) {
        return NextResponse.json(
          { success: false, error: 'Report ID is required' },
          { status: 400 }
        );
      }

      const existing = await Report.findById(reportId).select('type').lean<{ type: ReportType } | null>();
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Report not found' },
          { status: 404 }
        );
      }

      // Same per-type permission as viewing/generating - a role that
      // isn't allowed to see a report type shouldn't be able to delete
      // its records either (no separate "manage reports" permission
      // exists in rbac.ts to gate this more specifically).
      if (!hasPermission(user.role as UserRole, REPORT_TYPE_PERMISSIONS[existing.type])) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      await Report.findByIdAndDelete(reportId);

      return NextResponse.json({
        success: true,
        message: 'Report deleted successfully'
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
