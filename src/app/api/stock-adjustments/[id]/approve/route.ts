import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { StockAdjustment, Product } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';

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
          { success: false, error: `Cannot approve an adjustment with status "${adjustment.status}"` },
          { status: 400 }
        );
      }

      const product = await Product.findById(adjustment.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }

      // Stock may have moved since the request was made - apply the delta
      // against the live quantity, not the estimate captured at request time.
      const previousStock = product.stockQuantity || 0;
      const newStock = adjustment.adjustmentType === 'increase'
        ? previousStock + adjustment.quantity
        : previousStock - adjustment.quantity;

      if (newStock < 0) {
        return NextResponse.json(
          { success: false, error: 'Insufficient stock for decrease adjustment' },
          { status: 400 }
        );
      }

      product.stockQuantity = newStock;
      await product.save();

      adjustment.status = 'approved';
      adjustment.previousStock = previousStock;
      adjustment.newStock = newStock;
      adjustment.reviewedBy = user.name || 'Unknown';
      adjustment.reviewedById = user.id;
      adjustment.reviewedAt = new Date();
      await adjustment.save();

      logActivity({
        action: 'STOCK_ADJUSTMENT',
        description: `${user.name || 'Unknown'} approved a ${adjustment.adjustmentType} of ${adjustment.quantity} for "${product.name}"`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
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
