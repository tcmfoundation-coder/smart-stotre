import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { StockAdjustment, Product } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';

interface ApproveOutcome {
  status: number;
  error?: string;
  data?: Record<string, unknown>;
  logDetails?: { productName: string; adjustmentType: string; quantity: number };
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_stock_adjustments')(async (req, user) => {
    const session = await mongoose.startSession();
    try {
      await connectDB();

      // The adjustment's status flip and the product's stock change must
      // happen together or not at all - approving must never leave the
      // adjustment marked approved without the stock actually having moved,
      // or vice versa. Wrapping both in one transaction also closes the
      // duplicate-approval race: if two requests approve the same adjustment
      // concurrently, MongoDB detects the write conflict on the second one's
      // attempt to update the same documents and withTransaction retries it
      // from scratch, so it re-reads the now-"approved" status and correctly
      // rejects instead of applying the stock delta a second time.
      const outcome = await session.withTransaction(async (): Promise<ApproveOutcome> => {
        const adjustment = await StockAdjustment.findById(id).session(session);
        if (!adjustment) {
          return { status: 404, error: 'Stock adjustment not found' };
        }

        if (adjustment.status !== 'pending') {
          return { status: 400, error: `Cannot approve an adjustment with status "${adjustment.status}"` };
        }

        const product = await Product.findById(adjustment.productId).session(session);
        if (!product) {
          return { status: 404, error: 'Product not found' };
        }

        // Stock may have moved since the request was made - apply the delta
        // against the live quantity, not the estimate captured at request time.
        const previousStock = product.stockQuantity || 0;
        const newStock = adjustment.adjustmentType === 'increase'
          ? previousStock + adjustment.quantity
          : previousStock - adjustment.quantity;

        if (newStock < 0) {
          return { status: 400, error: 'Insufficient stock for decrease adjustment' };
        }

        product.stockQuantity = newStock;
        await product.save({ session });

        adjustment.status = 'approved';
        adjustment.previousStock = previousStock;
        adjustment.newStock = newStock;
        adjustment.reviewedBy = user.name || 'Unknown';
        adjustment.reviewedById = user.id;
        adjustment.reviewedAt = new Date();
        await adjustment.save({ session });

        return {
          status: 200,
          data: {
            ...adjustment.toObject(),
            _id: adjustment._id.toString(),
            id: adjustment._id.toString(),
            date: adjustment.createdAt,
          },
          logDetails: { productName: product.name, adjustmentType: adjustment.adjustmentType, quantity: adjustment.quantity },
        };
      });

      if (outcome.status === 200 && outcome.logDetails) {
        logActivity({
          action: 'STOCK_ADJUSTMENT',
          description: `${user.name || 'Unknown'} approved a ${outcome.logDetails.adjustmentType} of ${outcome.logDetails.quantity} for "${outcome.logDetails.productName}"`,
          userId: user.id,
          userName: user.name || 'Unknown',
          userRole: user.role || 'unknown',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          severity: 'warning',
        });
      }

      if (outcome.status !== 200) {
        return NextResponse.json({ success: false, error: outcome.error }, { status: outcome.status });
      }

      return NextResponse.json({ success: true, data: outcome.data });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    } finally {
      await session.endSession();
    }
  })(request);
}
