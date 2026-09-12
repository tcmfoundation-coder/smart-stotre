import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Sale, StockAdjustment, Return, GoodsReceipt } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import mongoose from 'mongoose';

export type MovementType = 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'OTHER';

export interface MovementEntry {
  id: string;
  type: MovementType;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  quantityChange: number;
  reference: string;
  performedBy: string;
}

function resolveDateRange(searchParams: URLSearchParams) {
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const dateRange = searchParams.get('dateRange') || 'month';

  const now = new Date();
  let start: Date;
  let end: Date;

  if (startDateParam && endDateParam) {
    start = new Date(startDateParam);
    end = new Date(endDateParam);
  } else {
    end = new Date(now);
    start = new Date(now);
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'quarter':
        start.setDate(start.getDate() - 90);
        break;
      case 'month':
      default:
        start.setDate(start.getDate() - 30);
    }
  }

  return { start, end };
}

// Merges Sales, approved Stock Adjustments, restocked Returns, and applied
// Goods Receipts into one normalized, chronologically-sorted feed - the only
// four record types that ever actually change Product.stockQuantity in this
// codebase (verified by grep). A Goods Receipt can contribute up to two
// entries: the accepted quantity (applied at receipt creation) and, only if
// approved, the over-delivered quantity (applied at approval time) - see
// src/lib/goods-receipts.ts for the accepted/over-delivery split. None of the
// source documents are modified here; this only reads and reshapes them.
export async function GET(request: NextRequest) {
  return withPermission('view_inventory_reports')(async (req) => {
    try {
      await connectDB();
      const searchParams = req.nextUrl.searchParams;
      const { start, end } = resolveDateRange(searchParams);
      const typeFilter = searchParams.get('type') as MovementType | null;
      const search = searchParams.get('search');
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
      const productId = searchParams.get('productId');

      const wantType = (t: MovementType) => !typeFilter || typeFilter === t;

      const entries: MovementEntry[] = [];

      if (wantType('SALE')) {
        const saleQuery: Record<string, unknown> = { status: 'completed', createdAt: { $gte: start, $lte: end } };
        if (productId && mongoose.isValidObjectId(productId)) {
          saleQuery['items.productId'] = productId;
        }
        const sales = await Sale.find(saleQuery)
          .populate('cashierId', 'name')
          .select('saleNumber createdAt items cashierId')
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              saleNumber: string;
              createdAt: Date;
              cashierId?: { name?: string } | mongoose.Types.ObjectId;
              items: { productId: mongoose.Types.ObjectId; productName: string; sku: string; quantity: number }[];
            }[]
          >();
        for (const sale of sales) {
          const cashierName =
            sale.cashierId && typeof sale.cashierId === 'object' && 'name' in sale.cashierId
              ? sale.cashierId.name
              : undefined;
          for (const item of sale.items) {
            if (productId && item.productId.toString() !== productId) continue;
            entries.push({
              id: `SALE-${sale._id.toString()}-${item.productId.toString()}`,
              type: 'SALE',
              date: sale.createdAt.toISOString(),
              productId: item.productId.toString(),
              productName: item.productName,
              sku: item.sku,
              quantityChange: -item.quantity,
              reference: sale.saleNumber,
              performedBy: cashierName || 'Unknown',
            });
          }
        }
      }

      if (wantType('ADJUSTMENT')) {
        const adjQuery: Record<string, unknown> = {
          status: 'approved',
          reviewedAt: { $gte: start, $lte: end },
        };
        if (productId && mongoose.isValidObjectId(productId)) {
          adjQuery.productId = productId;
        }
        const adjustments = await StockAdjustment.find(adjQuery)
          .select('productId productName adjustmentType quantity reviewedAt reviewedBy performedBy reason')
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              productId: mongoose.Types.ObjectId;
              productName: string;
              adjustmentType: 'increase' | 'decrease';
              quantity: number;
              reviewedAt: Date;
              reviewedBy?: string;
              performedBy: string;
              reason: string;
            }[]
          >();
        for (const adj of adjustments) {
          entries.push({
            id: `ADJUSTMENT-${adj._id.toString()}`,
            type: 'ADJUSTMENT',
            date: adj.reviewedAt.toISOString(),
            productId: adj.productId.toString(),
            productName: adj.productName,
            sku: '',
            quantityChange: adj.adjustmentType === 'increase' ? adj.quantity : -adj.quantity,
            reference: adj.reason,
            performedBy: adj.reviewedBy || adj.performedBy,
          });
        }
      }

      if (wantType('RETURN')) {
        const returnQuery: Record<string, unknown> = { createdAt: { $gte: start, $lte: end } };
        if (productId && mongoose.isValidObjectId(productId)) {
          returnQuery['items.productId'] = productId;
        }
        const returns = await Return.find(returnQuery)
          .select('returnNumber createdAt items processedBy')
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              returnNumber: string;
              createdAt: Date;
              processedBy: string;
              items: { productId: mongoose.Types.ObjectId; productName: string; sku: string; quantity: number; restocked: boolean }[];
            }[]
          >();
        for (const ret of returns) {
          for (const item of ret.items) {
            if (!item.restocked) continue;
            if (productId && item.productId.toString() !== productId) continue;
            entries.push({
              id: `RETURN-${ret._id.toString()}-${item.productId.toString()}`,
              type: 'RETURN',
              date: ret.createdAt.toISOString(),
              productId: item.productId.toString(),
              productName: item.productName,
              sku: item.sku,
              quantityChange: item.quantity,
              reference: ret.returnNumber,
              performedBy: ret.processedBy,
            });
          }
        }
      }

      if (wantType('PURCHASE')) {
        const receiptQuery: Record<string, unknown> = { receivedAt: { $gte: start, $lte: end } };
        if (productId && mongoose.isValidObjectId(productId)) {
          receiptQuery['items.productId'] = productId;
        }
        const receiptsReceived = await GoodsReceipt.find(receiptQuery)
          .select('receiptNumber receivedAt receivedBy items')
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              receiptNumber: string;
              receivedAt: Date;
              receivedBy: string;
              items: { productId: mongoose.Types.ObjectId; productName: string; sku?: string; acceptedQuantity: number }[];
            }[]
          >();
        for (const receipt of receiptsReceived) {
          for (const item of receipt.items) {
            if (item.acceptedQuantity <= 0) continue;
            if (productId && item.productId.toString() !== productId) continue;
            entries.push({
              id: `PURCHASE-${receipt._id.toString()}-${item.productId.toString()}`,
              type: 'PURCHASE',
              date: receipt.receivedAt.toISOString(),
              productId: item.productId.toString(),
              productName: item.productName,
              sku: item.sku || '',
              quantityChange: item.acceptedQuantity,
              reference: receipt.receiptNumber,
              performedBy: receipt.receivedBy,
            });
          }
        }

        // Approved over-delivery is a second, separately-dated stock event on
        // the same receipt - only receipts whose over-delivery was actually
        // approved (status 'completed') ever reach here, since a rejected or
        // still-pending over-delivery never touched stock.
        const overageQuery: Record<string, unknown> = {
          status: 'completed',
          overageDecisionAt: { $gte: start, $lte: end },
        };
        if (productId && mongoose.isValidObjectId(productId)) {
          overageQuery['items.productId'] = productId;
        }
        const receiptsOveraged = await GoodsReceipt.find(overageQuery)
          .select('receiptNumber overageDecisionAt overageDecisionBy items')
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              receiptNumber: string;
              overageDecisionAt?: Date;
              overageDecisionBy?: string;
              items: { productId: mongoose.Types.ObjectId; productName: string; sku?: string; overDeliveryQuantity: number }[];
            }[]
          >();
        for (const receipt of receiptsOveraged) {
          if (!receipt.overageDecisionAt) continue;
          for (const item of receipt.items) {
            if (item.overDeliveryQuantity <= 0) continue;
            if (productId && item.productId.toString() !== productId) continue;
            entries.push({
              id: `PURCHASE-OVERAGE-${receipt._id.toString()}-${item.productId.toString()}`,
              type: 'PURCHASE',
              date: receipt.overageDecisionAt.toISOString(),
              productId: item.productId.toString(),
              productName: item.productName,
              sku: item.sku || '',
              quantityChange: item.overDeliveryQuantity,
              reference: `${receipt.receiptNumber} (over-delivery approved)`,
              performedBy: receipt.overageDecisionBy || 'Unknown',
            });
          }
        }
      }

      let filtered = entries;
      if (search) {
        const needle = search.toLowerCase();
        filtered = filtered.filter(
          (e) => e.productName.toLowerCase().includes(needle) || e.sku.toLowerCase().includes(needle)
        );
      }

      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const total = filtered.length;
      const startIdx = (page - 1) * limit;
      const pageItems = filtered.slice(startIdx, startIdx + limit);

      return NextResponse.json({
        success: true,
        data: {
          movements: pageItems,
          pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
          notes: [],
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
