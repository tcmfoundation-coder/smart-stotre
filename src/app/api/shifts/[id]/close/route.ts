import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Shift } from '@/models';
import { computeLiveShiftStats } from '@/lib/shifts';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const shift = await Shift.findById(id);
      if (!shift) {
        return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
      }

      if (shift.status !== 'open') {
        return NextResponse.json({ success: false, error: 'This shift is already closed' }, { status: 400 });
      }

      // Only the person who opened it (or an admin/manager reconciling on
      // their behalf) can close it.
      const isOwner = shift.openedBy.toString() === user.id;
      const isSupervisor = user.role === 'admin' || user.role === 'manager';
      if (!isOwner && !isSupervisor) {
        return NextResponse.json(
          { success: false, error: 'You can only close your own shift' },
          { status: 403 }
        );
      }

      const data = await req.json();
      const actualCash = Number(data.actualCash);
      if (Number.isNaN(actualCash) || actualCash < 0) {
        return NextResponse.json(
          { success: false, error: 'A valid actual cash count is required' },
          { status: 400 }
        );
      }

      const closedAt = new Date();
      const liveStats = await computeLiveShiftStats(shift.openedBy.toString(), shift.openedAt, closedAt);
      const expectedCash = shift.openingCashBalance + liveStats.paymentMethodTotals.cash;

      shift.closedAt = closedAt;
      shift.closedBy = user.id;
      shift.closedByName = user.name || 'Unknown';
      shift.salesCount = liveStats.salesCount;
      shift.salesTotal = liveStats.salesTotal;
      shift.refundsCount = liveStats.refundsCount;
      shift.refundsTotal = liveStats.refundsTotal;
      shift.paymentMethodTotals = liveStats.paymentMethodTotals;
      shift.expectedCash = expectedCash;
      shift.actualCash = actualCash;
      shift.closingCashBalance = actualCash;
      shift.cashVariance = actualCash - expectedCash;
      shift.status = 'closed';
      await shift.save();

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
