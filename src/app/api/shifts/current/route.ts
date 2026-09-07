import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Shift } from '@/models';
import { computeLiveShiftStats } from '@/lib/shifts';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const shift = await Shift.findOne({ openedBy: user.id, status: 'open' });
      if (!shift) {
        return NextResponse.json({ success: true, data: null });
      }

      const liveStats = await computeLiveShiftStats(user.id, shift.openedAt);
      const expectedCash = shift.openingCashBalance + liveStats.paymentMethodTotals.cash;

      return NextResponse.json({
        success: true,
        data: {
          ...shift.toObject(),
          _id: shift._id.toString(),
          id: shift._id.toString(),
          ...liveStats,
          expectedCash,
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
