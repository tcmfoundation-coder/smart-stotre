import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Sale, Return } from '@/models';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  return withPermission('process_returns')(async (req) => {
    try {
      await connectDB();

      const saleNumber = req.nextUrl.searchParams.get('saleNumber');
      if (!saleNumber) {
        return NextResponse.json(
          { success: false, error: 'saleNumber is required' },
          { status: 400 }
        );
      }

      const sale = await Sale.findOne({ saleNumber: saleNumber.trim() });
      if (!sale) {
        return NextResponse.json(
          { success: false, error: 'Sale not found' },
          { status: 404 }
        );
      }

      if (sale.status !== 'completed') {
        return NextResponse.json(
          { success: false, error: `Cannot return items from a sale with status "${sale.status}"` },
          { status: 400 }
        );
      }

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

      const items = sale.items.map((item) => {
        const key = item.productId.toString();
        const alreadyReturned = alreadyReturnedByProduct.get(key) || 0;
        const unitRefundPrice = item.quantity > 0 ? item.total / item.quantity : 0;
        return {
          productId: key,
          productName: item.productName,
          sku: item.sku,
          quantitySold: item.quantity,
          quantityAlreadyReturned: alreadyReturned,
          quantityReturnable: Math.max(item.quantity - alreadyReturned, 0),
          unitRefundPrice,
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          saleId: sale._id.toString(),
          saleNumber: sale.saleNumber,
          customerId: sale.customerId?.toString(),
          customerName: sale.customerName,
          total: sale.total,
          totalAlreadyRefunded,
          totalRefundable: Math.max(sale.total - totalAlreadyRefunded, 0),
          items,
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
