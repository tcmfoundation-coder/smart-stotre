import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { handleApiError } from '@/lib/error-handler';
import { escapeRegex } from '@/lib/utils';

// GET all categories
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get('search') || '';

      const query: any = { isActive: true };

      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } }
        ];
      }
      
      const categories = await Category.find(query)
        .sort({ name: 1 });
      
      // Get product count for each category
      const Product = (await import('@/models/Product')).default;
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.countDocuments({ 
            categoryId: category._id, 
            isActive: true 
          });
          return {
            ...category.toObject(),
            productCount
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        data: categoriesWithCount
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

// POST create category
export async function POST(request: NextRequest) {
  return withPermission('manage_categories')(async (req, user) => {
    try {
      await connectDB();
      
      const data = await request.json();
      
      const category = await Category.create({
        ...data,
        createdBy: user.id
      });
      
      return NextResponse.json({
        success: true,
        data: category
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
