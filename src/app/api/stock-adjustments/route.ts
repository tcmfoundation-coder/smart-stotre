import { NextRequest, NextResponse } from 'next/server';
import { withManagerOrAdmin, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { handleApiError } from '@/lib/error-handler';
import { StockAdjustment } from '@/models';
import { Product } from '@/models';
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
          { productName: { $regex: safeSearch, $options: 'i' } },
          { reason: { $regex: safeSearch, $options: 'i' } },
        ];
      }
      if (status && status !== 'all') {
        query.status = status;
      }
      
      const adjustments = await StockAdjustment
        .find(query)
        .sort({ createdAt: -1 })
        .lean();
      
      return NextResponse.json({
        success: true,
        data: adjustments.map(adj => ({
          ...adj,
          _id: adj._id.toString(),
          id: adj._id.toString(),
          date: adj.createdAt,
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
  return withPermission('stock_adjustments')(async (req, user) => {
    try {
      await connectDB();
      
      const data = await request.json();
      
      const product = await Product.findById(data.productId);
      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      const previousStock = product.stockQuantity || 0;
      const newStock = data.adjustmentType === 'increase' 
        ? previousStock + data.quantity 
        : previousStock - data.quantity;
      
      if (newStock < 0) {
        return NextResponse.json(
          { success: false, error: 'Insufficient stock for decrease adjustment' },
          { status: 400 }
        );
      }
      
      // Update product stock
      product.stockQuantity = newStock;
      await product.save();
      
      // Create stock adjustment record
      const adjustment = await StockAdjustment.create({
        productId: data.productId,
        productName: product.name,
        adjustmentType: data.adjustmentType,
        quantity: data.quantity,
        previousStock,
        newStock,
        reason: data.reason,
        performedBy: user.name || 'Unknown',
        performedById: user.id,
        status: 'approved',
      });
      
      return NextResponse.json({
        success: true,
        data: {
          ...adjustment.toObject(),
          _id: adjustment._id.toString(),
          id: adjustment._id.toString(),
          date: adjustment.createdAt,
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
