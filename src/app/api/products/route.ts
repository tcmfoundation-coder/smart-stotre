import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { handleApiError } from '@/lib/error-handler';
import { escapeRegex } from '@/lib/utils';

// GET all products
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get('search') || '';
      const category = searchParams.get('category') || '';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');

      const query: any = { isActive: true };

      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { sku: { $regex: safeSearch, $options: 'i' } },
          { barcode: { $regex: safeSearch, $options: 'i' } }
        ];
      }
      
      if (category && category !== 'all') {
        query.categoryId = category;
      }
      
      const skip = (page - 1) * limit;
      const products = await Product.find(query)
        .populate('categoryId', 'name')
        .populate('supplierId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Product.countDocuments(query);
      
      return NextResponse.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
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

// POST create product
export async function POST(request: NextRequest) {
  return withPermission('create_products')(async (req, user) => {
    try {
      await connectDB();
      
      const data = await request.json();
      
      const product = await Product.create({
        ...data,
        createdBy: user.id
      });
      
      return NextResponse.json({
        success: true,
        data: product
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
