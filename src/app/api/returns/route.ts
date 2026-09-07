import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Sale, Product, Return } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { escapeRegex } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';

interface ReturnItemInput {
  productId: string;
  quantity: number;
  reason: string;
  restock?: boolean;
}

export async function GET(request: NextRequest) {
  return withPermission('process_returns')(async (req) => {
    try {
      await connectDB();

      const searchParams = req.nextUrl.searchParams;
      const search = searchParams.get('search') || '';

      const query: Record<string, unknown> = {};
      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { returnNumber: { $regex: safeSearch, $options: 'i' } },
          { saleNumber: { $regex: safeSearch, $options: 'i' } },
          { customerName: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      const returns = await Return.find(query).sort({ createdAt: -1 }).limit(100).lean();

      return NextResponse.json({
        success: true,
        data: returns.map((ret) => ({
          ...ret,
          _id: ret._id.toString(),
          id: ret._id.toString(),
          date: ret.createdAt,
        })),
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

export async function POST(request: NextRequest) {
  return withPermission('process_returns')(async (req, user) => {
    try {
      await connectDB();

      const data = await req.json();
      const saleId: string = data.saleId;
      const requestedItems: ReturnItemInput[] = data.items || [];
      const refundMethodInput: string = data.refundMethod;

      if (!saleId || requestedItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'saleId and at least one item are required' },
          { status: 400 }
        );
      }

      const validRefundMethods = ['cash', 'card', 'transfer', 'paystack'] as const;
      if (!validRefundMethods.includes(refundMethodInput as (typeof validRefundMethods)[number])) {
        return NextResponse.json(
          { success: false, error: 'A valid refund method is required' },
          { status: 400 }
        );
      }
      const refundMethod = refundMethodInput as (typeof validRefundMethods)[number];

      const sale = await Sale.findById(saleId);
      if (!sale) {
        return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
      }

      if (sale.status !== 'completed') {
        return NextResponse.json(
          { success: false, error: `Cannot return items from a sale with status "${sale.status}"` },
          { status: 400 }
        );
      }

      // Quantity already returned per product, across every prior return for this sale.
      const priorReturns = await Return.find({ saleId: sale._id }).lean();
      const alreadyReturnedByProduct = new Map<string, number>();
      let totalAlreadyRefunded = 0;
      for (const ret of priorReturns) {
        totalAlreadyRefunded += ret.totalRefund;
        for (const item of ret.items) {
          const key = item.productId.toString();
          alreadyReturnedByProduct.set(key, (alreadyReturnedByProduct.get(key) || 0) + item.quantity);
        }
      }

      const returnItems: {
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        unitRefundPrice: number;
        refundAmount: number;
        reason: string;
        restocked: boolean;
      }[] = [];

      for (const requested of requestedItems) {
        if (!requested.productId || !requested.quantity || requested.quantity <= 0) {
          return NextResponse.json(
            { success: false, error: 'Each return item needs a productId and a positive quantity' },
            { status: 400 }
          );
        }

        const saleItem = sale.items.find((it) => it.productId.toString() === requested.productId);
        if (!saleItem) {
          return NextResponse.json(
            { success: false, error: `Product ${requested.productId} was not part of this sale` },
            { status: 400 }
          );
        }

        const alreadyReturned = alreadyReturnedByProduct.get(requested.productId) || 0;
        const returnable = saleItem.quantity - alreadyReturned;
        if (requested.quantity > returnable) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot return ${requested.quantity} of "${saleItem.productName}" - only ${returnable} remaining returnable (sold ${saleItem.quantity}, already returned ${alreadyReturned})`,
            },
            { status: 400 }
          );
        }

        const unitRefundPrice = saleItem.quantity > 0 ? saleItem.total / saleItem.quantity : 0;
        const refundAmount = unitRefundPrice * requested.quantity;

        returnItems.push({
          productId: requested.productId,
          productName: saleItem.productName,
          sku: saleItem.sku,
          quantity: requested.quantity,
          unitRefundPrice,
          refundAmount,
          reason: requested.reason || 'Not specified',
          restocked: requested.restock !== false,
        });
      }

      const totalRefund = returnItems.reduce((sum, item) => sum + item.refundAmount, 0);

      // A sale can never be refunded beyond what was actually paid for it.
      if (totalAlreadyRefunded + totalRefund > sale.total + 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `This return (${totalRefund.toFixed(2)}) would exceed the amount paid for the sale (${(sale.total - totalAlreadyRefunded).toFixed(2)} remaining refundable)`,
          },
          { status: 400 }
        );
      }

      // Restock physically-returned items.
      for (const item of returnItems) {
        if (item.restocked) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } });
        }
      }

      const returnNumber = `RET-${Date.now()}`;
      const returnDoc = await Return.create({
        returnNumber,
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        customerId: sale.customerId,
        customerName: sale.customerName,
        items: returnItems,
        totalRefund,
        refundMethod,
        status: 'completed',
        processedBy: user.name || 'Unknown',
        processedById: user.id,
      });

      logActivity({
        action: 'RETURN_PROCESSED',
        description: `${user.name || 'Unknown'} processed a return of ${totalRefund.toFixed(2)} for sale ${sale.saleNumber}`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

      return NextResponse.json({
        success: true,
        data: {
          ...returnDoc.toObject(),
          _id: returnDoc._id.toString(),
          id: returnDoc._id.toString(),
          date: returnDoc.createdAt,
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
