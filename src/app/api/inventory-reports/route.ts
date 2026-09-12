import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Product, Sale, StockAdjustment, Return, GoodsReceipt } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import mongoose from 'mongoose';

// Average Inventory only has genuine historical data behind it because
// Product.stockQuantity is mutated in exactly four places in this codebase
// (sales decrement it, approved stock adjustments apply their delta,
// restocked returns increment it, and goods receipts increment it - verified
// by grep). That means the quantity a product held at any past instant can
// be reconstructed by starting at its current quantity and reversing every
// one of those event types that happened after that instant. There is
// no historical cost data, though - Product.buyingPrice is a single mutable
// current value - so both the beginning and ending valuations below price
// reconstructed quantities at *today's* buying price. This is the strongest
// data that genuinely exists; it's flagged to the caller via `limitations`
// rather than presented as exact.
const TURNOVER_LIMITATION =
  'Average Inventory is reconstructed from real stock-movement records (sales, approved adjustments, restocked returns, goods receipts), ' +
  'but valued at each product\'s current buying price because historical cost snapshots are not stored. ' +
  'If buying prices changed during this period, treat the figure as an informed approximation, not an exact historical valuation.';

interface DateRangeResult {
  start: Date;
  end: Date;
}

function resolveDateRange(searchParams: URLSearchParams): DateRangeResult {
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

interface ProductLean {
  _id: mongoose.Types.ObjectId;
  name: string;
  categoryId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; name: string };
  buyingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
}

interface SaleLean {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  items: { productId: mongoose.Types.ObjectId; quantity: number; buyingPrice: number }[];
}

interface AdjustmentLean {
  productId: mongoose.Types.ObjectId;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  reviewedAt?: Date;
}

interface ReturnLean {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  saleId: mongoose.Types.ObjectId;
  items: { productId: mongoose.Types.ObjectId; quantity: number; restocked: boolean }[];
}

interface GoodsReceiptLean {
  _id: mongoose.Types.ObjectId;
  status: 'completed' | 'pending_approval' | 'rejected';
  receivedAt: Date;
  overageDecisionAt?: Date;
  items: { productId: mongoose.Types.ObjectId; acceptedQuantity: number; overDeliveryQuantity: number }[];
}

/**
 * Reconstructs each product's quantity at `start` and `end` by starting from
 * its current stock and reversing every tracked movement that happened after
 * each cutoff (see TURNOVER_LIMITATION above for why this is valid here).
 */
function reconstructQuantities(
  products: ProductLean[],
  salesAfterStart: SaleLean[],
  adjustmentsAfterStart: AdjustmentLean[],
  returnsAfterStart: ReturnLean[],
  goodsReceiptsAfterStart: GoodsReceiptLean[],
  start: Date,
  end: Date
) {
  const reversalAfterStart = new Map<string, number>();
  const reversalAfterEnd = new Map<string, number>();

  const bump = (map: Map<string, number>, productId: string, delta: number) => {
    map.set(productId, (map.get(productId) || 0) + delta);
  };

  for (const sale of salesAfterStart) {
    const isAfterEnd = sale.createdAt > end;
    for (const item of sale.items) {
      const pid = item.productId.toString();
      // A sale decreased stock, so reversing it means adding the quantity back.
      bump(reversalAfterStart, pid, item.quantity);
      if (isAfterEnd) bump(reversalAfterEnd, pid, item.quantity);
    }
  }

  for (const adj of adjustmentsAfterStart) {
    const pid = adj.productId.toString();
    const signed = adj.adjustmentType === 'increase' ? -adj.quantity : adj.quantity;
    bump(reversalAfterStart, pid, signed);
    if (adj.reviewedAt && adj.reviewedAt > end) bump(reversalAfterEnd, pid, signed);
  }

  for (const ret of returnsAfterStart) {
    const isAfterEnd = ret.createdAt > end;
    for (const item of ret.items) {
      if (!item.restocked) continue;
      const pid = item.productId.toString();
      // A restocked return increased stock, so reversing it means subtracting.
      bump(reversalAfterStart, pid, -item.quantity);
      if (isAfterEnd) bump(reversalAfterEnd, pid, -item.quantity);
    }
  }

  for (const receipt of goodsReceiptsAfterStart) {
    const acceptedIsAfterStart = receipt.receivedAt > start;
    const acceptedIsAfterEnd = receipt.receivedAt > end;
    // Approved over-delivery is a second, separately-dated stock increase on
    // the same receipt (see src/lib/goods-receipts.ts) - a rejected or still
    // pending over-delivery never touched stock and is not reversed here.
    const overageApplies = receipt.status === 'completed' && !!receipt.overageDecisionAt;
    const overageIsAfterStart = overageApplies && receipt.overageDecisionAt! > start;
    const overageIsAfterEnd = overageApplies && receipt.overageDecisionAt! > end;

    for (const item of receipt.items) {
      const pid = item.productId.toString();
      if (acceptedIsAfterStart && item.acceptedQuantity > 0) {
        // A goods receipt increased stock, so reversing it means subtracting.
        bump(reversalAfterStart, pid, -item.acceptedQuantity);
        if (acceptedIsAfterEnd) bump(reversalAfterEnd, pid, -item.acceptedQuantity);
      }
      if (overageIsAfterStart && item.overDeliveryQuantity > 0) {
        bump(reversalAfterStart, pid, -item.overDeliveryQuantity);
        if (overageIsAfterEnd) bump(reversalAfterEnd, pid, -item.overDeliveryQuantity);
      }
    }
  }

  const qtyAtStart = new Map<string, number>();
  const qtyAtEnd = new Map<string, number>();
  for (const product of products) {
    const pid = product._id.toString();
    qtyAtStart.set(pid, Math.max(0, product.stockQuantity + (reversalAfterStart.get(pid) || 0)));
    qtyAtEnd.set(pid, Math.max(0, product.stockQuantity + (reversalAfterEnd.get(pid) || 0)));
  }

  return { qtyAtStart, qtyAtEnd };
}

export async function GET(request: NextRequest) {
  return withPermission('view_inventory_reports')(async (req) => {
    try {
      await connectDB();
      const { start, end } = resolveDateRange(req.nextUrl.searchParams);
      const categoryFilter = req.nextUrl.searchParams.get('category');

      const productQuery: Record<string, unknown> = { isActive: true };
      if (categoryFilter && categoryFilter !== 'all' && mongoose.isValidObjectId(categoryFilter)) {
        productQuery.categoryId = categoryFilter;
      }

      const [products, salesAfterStart, salesInPeriod, adjustmentsAfterStart, returnsAfterStart, goodsReceiptsAfterStart] = await Promise.all([
        Product.find(productQuery).populate('categoryId', 'name').lean<ProductLean[]>(),
        Sale.find({ status: 'completed', createdAt: { $gt: start } })
          .select('createdAt items.productId items.quantity items.buyingPrice')
          .lean<SaleLean[]>(),
        Sale.find({ status: 'completed', createdAt: { $gte: start, $lte: end } })
          .select('items.productId items.quantity items.buyingPrice')
          .lean<{ items: { productId: mongoose.Types.ObjectId; quantity: number; buyingPrice: number }[] }[]>(),
        StockAdjustment.find({ status: 'approved', reviewedAt: { $gt: start } })
          .select('productId adjustmentType quantity reviewedAt')
          .lean<AdjustmentLean[]>(),
        Return.find({ createdAt: { $gt: start } })
          .select('createdAt saleId items.productId items.quantity items.restocked')
          .lean<ReturnLean[]>(),
        GoodsReceipt.find({ $or: [{ receivedAt: { $gt: start } }, { overageDecisionAt: { $gt: start } }] })
          .select('status receivedAt overageDecisionAt items.productId items.acceptedQuantity items.overDeliveryQuantity')
          .lean<GoodsReceiptLean[]>(),
      ]);

      const { qtyAtStart, qtyAtEnd } = reconstructQuantities(
        products,
        salesAfterStart,
        adjustmentsAfterStart,
        returnsAfterStart,
        goodsReceiptsAfterStart,
        start,
        end
      );

      // Net COGS for the period: gross cost of items sold, less the cost of
      // items that were returned and physically restocked in the same
      // period (looked up from the *original* sale's recorded buying price,
      // not today's, since that's the real cost that applied at sale time).
      const grossCogs = salesInPeriod.reduce(
        (sum, sale) => sum + sale.items.reduce((s, item) => s + item.buyingPrice * item.quantity, 0),
        0
      );

      const returnsInPeriod = returnsAfterStart.filter((r) => r.createdAt >= start && r.createdAt <= end);
      const saleIdsForReturns = Array.from(new Set(returnsInPeriod.map((r) => r.saleId.toString())));
      const originalSales = saleIdsForReturns.length
        ? await Sale.find({ _id: { $in: saleIdsForReturns } })
            .select('items.productId items.buyingPrice')
            .lean<{ _id: mongoose.Types.ObjectId; items: { productId: mongoose.Types.ObjectId; buyingPrice: number }[] }[]>()
        : [];
      const saleCostByIdAndProduct = new Map<string, number>();
      for (const sale of originalSales) {
        for (const item of sale.items) {
          saleCostByIdAndProduct.set(`${sale._id.toString()}:${item.productId.toString()}`, item.buyingPrice);
        }
      }
      const returnedCogs = returnsInPeriod.reduce((sum, ret) => {
        return (
          sum +
          ret.items.reduce((s, item) => {
            if (!item.restocked) return s;
            const cost = saleCostByIdAndProduct.get(`${ret.saleId.toString()}:${item.productId.toString()}`) || 0;
            return s + cost * item.quantity;
          }, 0)
        );
      }, 0);

      const netCogs = grossCogs - returnedCogs;

      const computeMetrics = (rows: ProductLean[]) => {
        let endingValue = 0;
        let beginningValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        for (const product of rows) {
          const pid = product._id.toString();
          const endQty = qtyAtEnd.get(pid) ?? product.stockQuantity;
          const startQty = qtyAtStart.get(pid) ?? product.stockQuantity;
          endingValue += endQty * product.buyingPrice;
          beginningValue += startQty * product.buyingPrice;
          if (product.stockQuantity <= 0) outOfStockCount += 1;
          else if (product.stockQuantity <= product.minStockLevel) lowStockCount += 1;
        }
        const averageInventoryValue = (beginningValue + endingValue) / 2;
        return { endingValue, beginningValue, averageInventoryValue, lowStockCount, outOfStockCount };
      };

      const overall = computeMetrics(products);

      const categoryGroups = new Map<string, ProductLean[]>();
      for (const product of products) {
        const cat = product.categoryId as { _id: mongoose.Types.ObjectId; name: string } | undefined;
        const key = cat?._id?.toString() || 'uncategorized';
        if (!categoryGroups.has(key)) categoryGroups.set(key, []);
        categoryGroups.get(key)!.push(product);
      }

      const categoryBreakdown = Array.from(categoryGroups.entries()).map(([categoryId, rows]) => {
        const cat = rows[0].categoryId as { _id: mongoose.Types.ObjectId; name: string } | undefined;
        const metrics = computeMetrics(rows);
        const productIds = new Set(rows.map((p) => p._id.toString()));
        const categoryCogs = salesInPeriod.reduce(
          (sum, sale) =>
            sum +
            sale.items.reduce(
              (s, item) => (productIds.has(item.productId.toString()) ? s + item.buyingPrice * item.quantity : s),
              0
            ),
          0
        );
        return {
          categoryId,
          category: cat?.name || 'Uncategorized',
          totalValue: metrics.endingValue,
          averageInventoryValue: metrics.averageInventoryValue,
          cogs: categoryCogs,
          turnoverRatio: metrics.averageInventoryValue > 0 ? categoryCogs / metrics.averageInventoryValue : null,
          lowStock: metrics.lowStockCount,
          outOfStock: metrics.outOfStockCount,
        };
      }).sort((a, b) => b.totalValue - a.totalValue);

      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            totalInventoryValue: overall.endingValue,
            averageInventoryValue: overall.averageInventoryValue,
            cogs: netCogs,
            turnoverRatio: overall.averageInventoryValue > 0 ? netCogs / overall.averageInventoryValue : null,
            lowStockCount: overall.lowStockCount,
            outOfStockCount: overall.outOfStockCount,
          },
          categoryBreakdown,
          limitations: [TURNOVER_LIMITATION],
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
