import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { PurchaseOrder } from '@/models';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('approve_purchase_orders')(async () => {
    try {
      await connectDB();

      const order = await PurchaseOrder.findById(id);
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Purchase order not found' },
          { status: 404 }
        );
      }

      if (order.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: `Cannot approve an order with status "${order.status}"` },
          { status: 400 }
        );
      }

      order.status = 'approved';
      await order.save();

      return NextResponse.json({
        success: true,
        data: {
          ...order.toObject(),
          _id: order._id.toString(),
          id: order._id.toString(),
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
