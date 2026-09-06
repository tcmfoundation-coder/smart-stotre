import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Promotion } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { escapeRegex } from '@/lib/utils';
import { serializePromotion } from '@/lib/promotions';

// GET all promotions
export async function GET(request: NextRequest) {
  return withAuth(async () => {
    try {
      await connectDB();

      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || 'all';
      const type = searchParams.get('type') || 'all';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');

      const query: any = {};

      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } },
        ];
      }

      if (type !== 'all') {
        query.type = type;
      }

      // 'expired' isn't a stored status - it's computed from endDate, so it
      // can't be pushed into the Mongo query and is filtered after fetching.
      if (status !== 'all' && status !== 'expired') {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const promotions = await Promotion.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      let serialized = await Promise.all(promotions.map(serializePromotion));

      if (status === 'expired') {
        serialized = serialized.filter((p) => p.effectiveStatus === 'expired');
      }

      const total = await Promotion.countDocuments(query);

      return NextResponse.json({
        success: true,
        data: serialized,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
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

// POST create promotion
export async function POST(request: NextRequest) {
  return withPermission('manage_promotions')(async (req, user) => {
    try {
      await connectDB();

      const data = await request.json();

      if (!data.name || !data.type || data.value === undefined) {
        return NextResponse.json(
          { success: false, error: 'name, type, and value are required' },
          { status: 400 }
        );
      }

      const startDate = data.startDate ? new Date(data.startDate) : new Date();
      const status = startDate > new Date() ? 'scheduled' : 'active';

      const promotion = await Promotion.create({
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value,
        startDate,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status,
        categoryIds: data.categoryIds || [],
        productIds: data.productIds || [],
        minPurchase: data.minPurchase,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        createdBy: user.id,
      });

      const serialized = await serializePromotion(promotion.toObject());

      return NextResponse.json({
        success: true,
        data: serialized,
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
