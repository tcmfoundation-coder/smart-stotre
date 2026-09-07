import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Shift } from '@/models';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const existingOpenShift = await Shift.findOne({ openedBy: user.id, status: 'open' });
      if (existingOpenShift) {
        return NextResponse.json(
          { success: false, error: 'You already have an open shift. Close it before opening a new one.' },
          { status: 400 }
        );
      }

      const data = await req.json();
      const openingCashBalance = Number(data.openingCashBalance);

      if (Number.isNaN(openingCashBalance) || openingCashBalance < 0) {
        return NextResponse.json(
          { success: false, error: 'A valid opening cash balance is required' },
          { status: 400 }
        );
      }

      const shift = await Shift.create({
        openedAt: new Date(),
        openedBy: user.id,
        openedByName: user.name || 'Unknown',
        branchId: user.branchId || undefined,
        openingCashBalance,
        status: 'open',
      });

      return NextResponse.json({
        success: true,
        data: { ...shift.toObject(), _id: shift._id.toString(), id: shift._id.toString() },
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
