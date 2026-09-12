import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { GoodsReceipt } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';

// Rejects the over-delivered portion of a receipt. No stock change - it was
// never applied while pending. The accepted (in-order) portion of the same
// receipt, already applied at creation time, is unaffected.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_purchase_orders')(async (req, user) => {
    try {
      await connectDB();

      if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid goods receipt id' }, { status: 400 });
      }

      // Atomic compare-and-swap, same reasoning as approve-overage: only a
      // receipt still 'pending_approval' matches, so a concurrent or retried
      // rejection call cannot double-process an already-decided receipt.
      const receipt = await GoodsReceipt.findOneAndUpdate(
        { _id: id, status: 'pending_approval' },
        {
          status: 'rejected',
          overageDecisionBy: user.name || 'Unknown',
          overageDecisionById: user.id,
          overageDecisionAt: new Date(),
        },
        { new: true }
      );

      if (!receipt) {
        const existing = await GoodsReceipt.findById(id);
        if (!existing) {
          return NextResponse.json({ success: false, error: 'Goods receipt not found' }, { status: 404 });
        }
        return NextResponse.json(
          { success: false, error: `Cannot reject over-delivery on a receipt with status "${existing.status}"` },
          { status: 400 }
        );
      }

      logActivity({
        action: 'GOODS_RECEIPT_OVERAGE_REJECTED',
        description: `${user.name || 'Unknown'} rejected the over-delivered quantity on goods receipt ${receipt.receiptNumber}`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

      const receiptObj = receipt.toObject();
      return NextResponse.json({
        success: true,
        data: {
          ...receiptObj,
          _id: receiptObj._id.toString(),
          id: receiptObj._id.toString(),
          purchaseOrderId: receiptObj.purchaseOrderId.toString(),
          supplierId: receiptObj.supplierId.toString(),
          receivedById: receiptObj.receivedById.toString(),
        },
      });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    }
  })(request);
}
