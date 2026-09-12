import { NextRequest, NextResponse } from 'next/server';
import { withManagerOrAdmin, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { AppError, handleApiError } from '@/lib/error-handler';
import { PurchaseOrder } from '@/models';
import { escapeRegex } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';

export async function GET(request: NextRequest) {
  return withManagerOrAdmin(async (req, user) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const status = searchParams.get('status');

      const query: any = {};
      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { orderNumber: { $regex: safeSearch, $options: 'i' } },
          { supplierName: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const orders = await PurchaseOrder
        .find(query)
        .sort({ createdAt: -1 })
        .lean();
      
      return NextResponse.json({
        success: true,
        data: orders.map(order => ({
          ...order,
          _id: order._id.toString(),
          id: order._id.toString(),
          orderDate: order.orderDate,
        }))
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
  return withPermission('create_purchase_orders')(async (req, user) => {
    try {
      await connectDB();
      
      const data = await request.json();

      if (!Array.isArray(data.items) || data.items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one item is required' },
          { status: 400 }
        );
      }

      // Recompute each line's total and the order's totalAmount server-side
      // rather than trusting the client's arithmetic - this is an internal
      // purchasing record (not a customer-facing payment), but nothing else
      // in the app should ever have to guess whether a stored totalAmount
      // actually matches its own line items.
      const items = data.items.map((item: { productId: string; productName: string; quantity: number; unitPrice: number }) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new AppError('Each item needs a positive quantity and a non-negative unit price', 400, true);
        }
        return {
          productId: item.productId,
          productName: item.productName,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      });
      const totalAmount = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);

      const order = await PurchaseOrder.create({
        ...data,
        items,
        totalAmount,
        createdBy: user.name || 'Unknown',
        createdById: user.id,
      });

      logActivity({
        action: 'PURCHASE_ORDER_CREATED',
        description: `${user.name || 'Unknown'} created purchase order ${order.orderNumber} for "${order.supplierName}" (${order.totalAmount})`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'info',
      });

      return NextResponse.json({
        success: true,
        data: {
          ...order.toObject(),
          _id: order._id.toString(),
          id: order._id.toString(),
          orderDate: order.orderDate,
        }
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
