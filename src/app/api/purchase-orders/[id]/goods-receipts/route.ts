import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withManagerOrAdmin, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { GoodsReceipt, Product, PurchaseOrder } from '@/models';
import { AppError, handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';
import {
  RECEIVABLE_PO_STATUSES,
  computeLineProgress,
  deriveNextPurchaseOrderStatus,
  getPriorReceipts,
  splitAcceptedAndOverDelivery,
  type POLineInput,
} from '@/lib/goods-receipts';

interface PurchaseOrderItemLean {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
}

interface PurchaseOrderLean {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  status: 'pending' | 'approved' | 'partially_received' | 'delivered' | 'cancelled';
  items: PurchaseOrderItemLean[];
}

interface ReceivedItemInput {
  productId: string;
  receivedQuantity: number;
  rejectedQuantity?: number;
  reason?: string;
}

interface TransactionResult {
  receipt: Record<string, unknown>;
  purchaseOrder: Record<string, unknown> | null;
  didCreate: boolean;
  hadOverDelivery: boolean;
}

// GET: lookup for the receiving UI - ordered/previously-applied/remaining per
// line, plus the receipt history, computed live (see src/lib/goods-receipts.ts).
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withManagerOrAdmin(async () => {
    try {
      await connectDB();

      if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid purchase order id' }, { status: 400 });
      }

      const po = await PurchaseOrder.findById(id).lean<PurchaseOrderLean | null>();
      if (!po) {
        return NextResponse.json({ success: false, error: 'Purchase order not found' }, { status: 404 });
      }

      const priorReceipts = await getPriorReceipts(po._id);
      const lines = computeLineProgress(po.items as POLineInput[], priorReceipts);

      const receipts = await GoodsReceipt.find({ purchaseOrderId: po._id })
        .sort({ receivedAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          purchaseOrder: {
            _id: po._id.toString(),
            id: po._id.toString(),
            orderNumber: po.orderNumber,
            status: po.status,
            supplierName: po.supplierName,
          },
          canReceive: RECEIVABLE_PO_STATUSES.includes(po.status),
          lines,
          receipts: receipts.map((r) => ({
            ...r,
            _id: r._id.toString(),
            id: r._id.toString(),
            purchaseOrderId: r.purchaseOrderId.toString(),
            supplierId: r.supplierId.toString(),
            receivedById: r.receivedById.toString(),
          })),
        },
      });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    }
  })(request);
}

// POST: record a (possibly partial) delivery against this purchase order.
// Creating a PO never touches inventory - only this route does, and only for
// the portion of the delivery that fits within what remains on the order.
// Anything beyond that is over-delivery and is held for approval (see the
// approve-overage/reject-overage routes) rather than applied here.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('manage_inventory')(async (req, user) => {
    const session = await mongoose.startSession();
    try {
      await connectDB();

      if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ success: false, error: 'Invalid purchase order id' }, { status: 400 });
      }

      const body = await req.json();
      const idempotencyKey: string | undefined = body.idempotencyKey;
      const submittedItems: ReceivedItemInput[] = Array.isArray(body.items) ? body.items : [];
      const notes: string | undefined = body.notes;

      if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return NextResponse.json(
          { success: false, error: 'idempotencyKey is required to safely submit a goods receipt' },
          { status: 400 }
        );
      }

      if (submittedItems.length === 0) {
        return NextResponse.json({ success: false, error: 'At least one item is required' }, { status: 400 });
      }

      const result = await session.withTransaction(async (): Promise<TransactionResult> => {
        // Idempotency: a retried/double-submitted request with the same key
        // returns the receipt already created for it instead of creating a
        // second one or double-applying inventory.
        const existing = await GoodsReceipt.findOne({ idempotencyKey }).session(session).lean();
        if (existing) {
          const existingPO = await PurchaseOrder.findById(existing.purchaseOrderId).session(session).lean<PurchaseOrderLean | null>();
          return {
            receipt: serializeReceipt(existing),
            purchaseOrder: existingPO ? serializePO(existingPO) : null,
            didCreate: false,
            hadOverDelivery: false,
          };
        }

        const po = await PurchaseOrder.findById(id).session(session).lean<PurchaseOrderLean | null>();
        if (!po) {
          throw new AppError('Purchase order not found', 404, true);
        }

        if (!RECEIVABLE_PO_STATUSES.includes(po.status)) {
          throw new AppError(
            `Cannot receive goods against a purchase order with status "${po.status}"`,
            400,
            true
          );
        }

        const poItemByProduct = new Map(po.items.map((it) => [it.productId.toString(), it]));

        const productIds = submittedItems.map((it) => it.productId);
        for (const pid of productIds) {
          if (!pid || !mongoose.isValidObjectId(pid)) {
            throw new AppError('Each item requires a valid productId', 400, true);
          }
        }

        const products = await Product.find({ _id: { $in: productIds } })
          .session(session)
          .select('sku')
          .lean<{ _id: mongoose.Types.ObjectId; sku: string }[]>();
        const skuByProduct = new Map(products.map((p) => [p._id.toString(), p.sku]));

        const priorReceipts = await getPriorReceipts(po._id, session);
        const lineProgress = computeLineProgress(po.items as POLineInput[], priorReceipts);
        const remainingByProduct = new Map(lineProgress.map((l) => [l.productId, l.remainingQuantity]));

        const receiptItems: {
          productId: string;
          productName: string;
          sku?: string;
          orderedQuantity: number;
          receivedQuantity: number;
          rejectedQuantity: number;
          acceptedQuantity: number;
          overDeliveryQuantity: number;
          reason?: string;
        }[] = [];

        for (const submitted of submittedItems) {
          const receivedQuantity = Number(submitted.receivedQuantity);
          const rejectedQuantity = Number(submitted.rejectedQuantity || 0);

          if (!Number.isInteger(receivedQuantity) || receivedQuantity < 0) {
            throw new AppError('receivedQuantity must be a non-negative whole number', 400, true);
          }
          if (!Number.isInteger(rejectedQuantity) || rejectedQuantity < 0) {
            throw new AppError('rejectedQuantity must be a non-negative whole number', 400, true);
          }
          if (rejectedQuantity > receivedQuantity) {
            throw new AppError('rejectedQuantity cannot exceed receivedQuantity', 400, true);
          }
          if (receivedQuantity === 0) {
            continue;
          }

          const poItem = poItemByProduct.get(submitted.productId);
          if (!poItem) {
            throw new AppError(`Product ${submitted.productId} is not part of this purchase order`, 400, true);
          }
          if (!skuByProduct.has(submitted.productId)) {
            throw new AppError(`Product ${submitted.productId} no longer exists`, 404, true);
          }

          const remaining = remainingByProduct.get(submitted.productId) ?? poItem.quantity;
          const netToStock = receivedQuantity - rejectedQuantity;
          const { acceptedQuantity, overDeliveryQuantity } = splitAcceptedAndOverDelivery(netToStock, remaining);

          receiptItems.push({
            productId: submitted.productId,
            productName: poItem.productName,
            sku: skuByProduct.get(submitted.productId),
            orderedQuantity: poItem.quantity,
            receivedQuantity,
            rejectedQuantity,
            acceptedQuantity,
            overDeliveryQuantity,
            reason: submitted.reason,
          });
        }

        if (receiptItems.length === 0) {
          throw new AppError('At least one item must have a received quantity greater than 0', 400, true);
        }

        const hadOverDelivery = receiptItems.some((it) => it.overDeliveryQuantity > 0);
        const status: 'completed' | 'pending_approval' = hadOverDelivery ? 'pending_approval' : 'completed';
        const receiptNumber = `GR-${Date.now()}`;

        let createdDocs;
        try {
          createdDocs = await GoodsReceipt.create(
            [
              {
                receiptNumber,
                purchaseOrderId: po._id,
                orderNumber: po.orderNumber,
                supplierId: po.supplierId,
                supplierName: po.supplierName,
                items: receiptItems,
                status,
                receivedBy: user.name || 'Unknown',
                receivedById: user.id,
                receivedAt: new Date(),
                notes,
                idempotencyKey,
              },
            ],
            { session }
          );
        } catch (createError) {
          // A concurrent request with the same idempotencyKey won the race to
          // insert first - treat this as the same successful outcome rather
          // than an error, and never apply inventory a second time.
          if (isDuplicateKeyError(createError)) {
            const winner = await GoodsReceipt.findOne({ idempotencyKey }).session(session).lean();
            if (winner) {
              const winnerPO = await PurchaseOrder.findById(winner.purchaseOrderId).session(session).lean<PurchaseOrderLean | null>();
              return {
                receipt: serializeReceipt(winner),
                purchaseOrder: winnerPO ? serializePO(winnerPO) : null,
                didCreate: false,
                hadOverDelivery: false,
              };
            }
          }
          throw createError;
        }

        const receiptDoc = createdDocs[0];

        for (const item of receiptItems) {
          if (item.acceptedQuantity > 0) {
            const updated = await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stockQuantity: item.acceptedQuantity } },
              { session }
            );
            if (!updated) {
              throw new AppError(`Product ${item.productId} no longer exists`, 404, true);
            }
          }
        }

        const updatedLineProgress = computeLineProgress(po.items as POLineInput[], [
          ...priorReceipts,
          { status, items: receiptItems.map((it) => ({ productId: it.productId as unknown as mongoose.Types.ObjectId, acceptedQuantity: it.acceptedQuantity, overDeliveryQuantity: it.overDeliveryQuantity })) },
        ]);
        const nextStatus = deriveNextPurchaseOrderStatus(po.status, updatedLineProgress);

        let finalPO: PurchaseOrderLean = po;
        if (nextStatus !== po.status) {
          const updateFields: Record<string, unknown> = { status: nextStatus };
          if (nextStatus === 'delivered') updateFields.actualDelivery = new Date();
          const updated = await PurchaseOrder.findByIdAndUpdate(po._id, updateFields, { session, new: true }).lean<PurchaseOrderLean | null>();
          if (updated) finalPO = updated;
        }

        return {
          receipt: serializeReceipt(receiptDoc.toObject()),
          purchaseOrder: serializePO(finalPO),
          didCreate: true,
          hadOverDelivery,
        };
      });

      if (result.didCreate) {
        logActivity({
          action: 'GOODS_RECEIPT_CREATED',
          description: `${user.name || 'Unknown'} recorded a goods receipt for purchase order ${result.purchaseOrder?.orderNumber ?? id}${result.hadOverDelivery ? ' (includes over-delivery pending approval)' : ''}`,
          userId: user.id,
          userName: user.name || 'Unknown',
          userRole: user.role || 'unknown',
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          severity: result.hadOverDelivery ? 'warning' : 'info',
        });
      }

      return NextResponse.json({ success: true, data: { receipt: result.receipt, purchaseOrder: result.purchaseOrder } });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
    } finally {
      await session.endSession();
    }
  })(request);
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

interface ReceiptLeanForSerialize {
  _id: mongoose.Types.ObjectId;
  purchaseOrderId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  receivedById: mongoose.Types.ObjectId;
}

function serializeReceipt<T extends ReceiptLeanForSerialize>(receipt: T): Record<string, unknown> {
  return {
    ...receipt,
    _id: receipt._id.toString(),
    id: receipt._id.toString(),
    purchaseOrderId: receipt.purchaseOrderId.toString(),
    supplierId: receipt.supplierId.toString(),
    receivedById: receipt.receivedById.toString(),
  } as unknown as Record<string, unknown>;
}

function serializePO(po: PurchaseOrderLean): Record<string, unknown> {
  return {
    ...po,
    _id: po._id.toString(),
    id: po._id.toString(),
  };
}
