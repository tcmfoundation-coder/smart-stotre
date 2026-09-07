import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Shift } from '@/models';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const isSupervisor = user.role === 'admin' || user.role === 'manager';
      const query: Record<string, unknown> = isSupervisor ? {} : { openedBy: user.id };

      const status = req.nextUrl.searchParams.get('status');
      if (status === 'open' || status === 'closed') {
        query.status = status;
      }

      const shifts = await Shift.find(query)
        .sort({ openedAt: -1 })
        .limit(100)
        .lean();

      return NextResponse.json({
        success: true,
        data: shifts.map((shift) => ({ ...shift, _id: shift._id.toString(), id: shift._id.toString() })),
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
