import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { StockAdjustment } from '@/models';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_stock_adjustments')(async (req, user) => {
    try {
      await connectDB();

      const adjustment = await StockAdjustment.findById(id);
      if (!adjustment) {
        return NextResponse.json(
          { success: false, error: 'Stock adjustment not found' },
          { status: 404 }
        );
      }

      if (adjustment.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: `Cannot reject an adjustment with status "${adjustment.status}"` },
          { status: 400 }
        );
      }

      // No stock change - it was never applied while pending.
      adjustment.status = 'rejected';
      adjustment.reviewedBy = user.name || 'Unknown';
      adjustment.reviewedById = user.id;
      adjustment.reviewedAt = new Date();
      await adjustment.save();

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
