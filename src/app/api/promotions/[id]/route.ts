import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Promotion } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { serializePromotion } from '@/lib/promotions';

// GET single promotion
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAuth(async () => {
    try {
      await connectDB();

      const promotion = await Promotion.findById(id).lean();

      if (!promotion) {
        return NextResponse.json(
          { success: false, error: 'Promotion not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: await serializePromotion(promotion),
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

// PUT update promotion
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('manage_promotions')(async () => {
    try {
      await connectDB();

      const data = await request.json();

      const update: any = {
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value,
        categoryIds: data.categoryIds,
        productIds: data.productIds,
        minPurchase: data.minPurchase,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
      };
      if (data.startDate) update.startDate = new Date(data.startDate);
      if (data.endDate) update.endDate = new Date(data.endDate);

      // Remove undefined keys so they don't overwrite existing values.
      Object.keys(update).forEach((key) => update[key] === undefined && delete update[key]);

      const promotion = await Promotion.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      }).lean();

      if (!promotion) {
        return NextResponse.json(
          { success: false, error: 'Promotion not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: await serializePromotion(promotion),
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

// DELETE promotion
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('manage_promotions')(async () => {
    try {
      await connectDB();

      const promotion = await Promotion.findByIdAndDelete(id);

      if (!promotion) {
        return NextResponse.json(
          { success: false, error: 'Promotion not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Promotion deleted successfully',
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
