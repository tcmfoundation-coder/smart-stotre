import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { GoodsReceipt, Product, PurchaseOrder } from '@/models';
import { AppError, handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';
import { computeLineProgress, deriveNextPurchaseOrderStatus, getPriorReceipts, type POLineInput } from '@/lib/goods-receipts';

interface PurchaseOrderLean {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  status: 'pending' | 'approved' | 'partially_received' | 'delivered' | 'cancelled';
  items: { productId: mongoose.Types.ObjectId; productName: string; quantity: number }[];
}

// Authorizes the over-delivered portion of a receipt to actually be added to
// stock. The accepted (in-order) portion of the same receipt was already
// applied at creation time and is unaffected either way.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_purchase_orders')(async (req, user) => {
    const session = await mongoose.startSession();
    try {
      await connectDB();

      if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid goods receipt id' }, { status: 400 });
      }

      let responseReceipt: Record<string, unknown> | null = null;
      let responsePO: Record<string, unknown> | null = null;
      let poOrderNumber = '';

      await session.withTransaction(async () => {
        // Atomic compare-and-swap: only a receipt still in 'pending_approval'
        // matches. A concurrent or retried approval call that loses the race
        // matches zero documents and is detected below rather than
        // double-applying the over-delivery to stock.
        const receipt = await GoodsReceipt.findOneAndUpdate(
          { _id: id, status: 'pending_approval' },
          {
            status: 'completed',
            overageDecisionBy: user.name || 'Unknown',
            overageDecisionById: user.id,
            overageDecisionAt: new Date(),
          },
          { session, new: true }
        );

        if (!receipt) {
          const existing = await GoodsReceipt.findById(id).session(session);
          if (!existing) {
            throw new AppError('Goods receipt not found', 404, true);
          }
          throw new AppError(
            `Cannot approve over-delivery on a receipt with status "${existing.status}"`,
            400,
            true
          );
        }

        for (const item of receipt.items) {
          if (item.overDeliveryQuantity > 0) {
            const updated = await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stockQuantity: item.overDeliveryQuantity } },
              { session }
            );
            if (!updated) {
              throw new AppError(`Product ${item.productId.toString()} no longer exists`, 404, true);
            }
          }
        }

        const po = await PurchaseOrder.findById(receipt.purchaseOrderId).session(session).lean<PurchaseOrderLean | null>();
        if (po) {
          poOrderNumber = po.orderNumber;
          const priorReceipts = await getPriorReceipts(po._id, session);
          const lineProgress = computeLineProgress(po.items as POLineInput[], priorReceipts);
          const nextStatus = deriveNextPurchaseOrderStatus(po.status, lineProgress);

          let finalPO: PurchaseOrderLean = po;
          if (nextStatus !== po.status) {
            const updateFields: Record<string, unknown> = { status: nextStatus };
            if (nextStatus === 'delivered') updateFields.actualDelivery = new Date();
            const updated = await PurchaseOrder.findByIdAndUpdate(po._id, updateFields, { session, new: true }).lean<PurchaseOrderLean | null>();
            if (updated) finalPO = updated;
          }
          responsePO = { ...finalPO, _id: finalPO._id.toString(), id: finalPO._id.toString() };
        }

        const receiptObj = receipt.toObject();
        responseReceipt = {
          ...receiptObj,
          _id: receiptObj._id.toString(),
          id: receiptObj._id.toString(),
          purchaseOrderId: receiptObj.purchaseOrderId.toString(),
          supplierId: receiptObj.supplierId.toString(),
          receivedById: receiptObj.receivedById.toString(),
        };
      });

      logActivity({
        action: 'GOODS_RECEIPT_OVERAGE_APPROVED',
        description: `${user.name || 'Unknown'} approved the over-delivered quantity on a goods receipt for purchase order ${poOrderNumber || id}`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

      return NextResponse.json({ success: true, data: { receipt: responseReceipt, purchaseOrder: responsePO } });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    } finally {
      await session.endSession();
    }
  })(request);
}
