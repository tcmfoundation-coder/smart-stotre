import { NextRequest, NextResponse } from 'next/server';
import { withManagerOrAdmin, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { handleApiError } from '@/lib/error-handler';
import { PurchaseOrder } from '@/models';
import { escapeRegex } from '@/lib/utils';

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
      
      const order = await PurchaseOrder.create({
        ...data,
        createdBy: user.name || 'Unknown',
        createdById: user.id,
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
