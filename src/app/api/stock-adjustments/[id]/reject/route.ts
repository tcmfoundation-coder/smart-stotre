import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { StockAdjustment } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_stock_adjustments')(async (req, user) => {
    try {
      await connectDB();

      // No stock change either way - it was never applied while pending.
      // Still an atomic compare-and-swap (only a still-pending adjustment
      // matches) so a concurrent or retried reject call, or a reject that
      // loses a race against an approval, can't double-process the same
      // adjustment.
      const adjustment = await StockAdjustment.findOneAndUpdate(
        { _id: id, status: 'pending' },
        {
          status: 'rejected',
          reviewedBy: user.name || 'Unknown',
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
        { new: true }
      );

      if (!adjustment) {
        const existing = await StockAdjustment.findById(id);
        if (!existing) {
          return NextResponse.json(
            { success: false, error: 'Stock adjustment not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { success: false, error: `Cannot reject an adjustment with status "${existing.status}"` },
          { status: 400 }
        );
      }

      logActivity({
        action: 'STOCK_ADJUSTMENT_REJECTED',
        description: `${user.name || 'Unknown'} rejected a stock adjustment request for "${adjustment.productName}"`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'info',
      });

      return NextResponse.json({
        success: true,
        data: {
          ...adjustment.toObject(),
          _id: adjustment._id.toString(),
          id: adjustment._id.toString(),
          date: adjustment.createdAt,
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
