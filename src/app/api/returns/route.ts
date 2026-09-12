import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Sale, Product, Return } from '@/models';
import { AppError, handleApiError } from '@/lib/error-handler';
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

interface ReturnTransactionResult {
  returnDoc: Record<string, unknown>;
  totalRefund: number;
  saleNumber: string;
}

export async function POST(request: NextRequest) {
  return withPermission('process_returns')(async (req, user) => {
    const session = await mongoose.startSession();
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

      // Reading the sale/prior-returns, validating the requested quantities
      // and refund total against them, restocking, and creating the new
      // Return record all happen inside one transaction. Without this, two
      // concurrent returns against the same sale could each read the same
      // "already returned" total, each pass the same returnable/refundable
      // check, and jointly over-restock inventory or refund more than the
      // sale was ever paid for - a real duplicate-application race, not a
      // theoretical one, since nothing here previously re-checked state
      // between the read and the write.
      const result = await session.withTransaction(async (): Promise<ReturnTransactionResult> => {
        const sale = await Sale.findById(saleId).session(session);
        if (!sale) {
          throw new AppError('Sale not found', 404, true);
        }

        if (sale.status !== 'completed') {
          throw new AppError(`Cannot return items from a sale with status "${sale.status}"`, 400, true);
        }

        // Quantity already returned per product, across every prior return
        // for this sale - re-read fresh inside this transaction every time.
        const priorReturns = await Return.find({ saleId: sale._id }).session(session).lean();
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
          if (!requested.productId || !Number.isInteger(requested.quantity) || requested.quantity <= 0) {
            throw new AppError('Each return item needs a productId and a positive whole-number quantity', 400, true);
          }

          const saleItem = sale.items.find((it) => it.productId.toString() === requested.productId);
          if (!saleItem) {
            throw new AppError(`Product ${requested.productId} was not part of this sale`, 400, true);
          }

          const alreadyReturned = alreadyReturnedByProduct.get(requested.productId) || 0;
          const returnable = saleItem.quantity - alreadyReturned;
          if (requested.quantity > returnable) {
            throw new AppError(
              `Cannot return ${requested.quantity} of "${saleItem.productName}" - only ${returnable} remaining returnable (sold ${saleItem.quantity}, already returned ${alreadyReturned})`,
              400,
              true
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
          throw new AppError(
            `This return (${totalRefund.toFixed(2)}) would exceed the amount paid for the sale (${(sale.total - totalAlreadyRefunded).toFixed(2)} remaining refundable)`,
            400,
            true
          );
        }

        // Restock physically-returned items - atomic increments, in the same
        // transaction as the Return record below.
        for (const item of returnItems) {
          if (item.restocked) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stockQuantity: item.quantity } }, { session });
          }
        }

        const returnNumber = `RET-${Date.now()}`;
        const [createdReturn] = await Return.create(
          [
            {
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
            },
          ],
          { session }
        );

        return {
          returnDoc: {
            ...createdReturn.toObject(),
            _id: createdReturn._id.toString(),
            id: createdReturn._id.toString(),
            date: createdReturn.createdAt,
          },
          totalRefund,
          saleNumber: sale.saleNumber,
        };
      });

      logActivity({
        action: 'RETURN_PROCESSED',
        description: `${user.name || 'Unknown'} processed a return of ${result.totalRefund.toFixed(2)} for sale ${result.saleNumber}`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

      return NextResponse.json({ success: true, data: result.returnDoc });
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
