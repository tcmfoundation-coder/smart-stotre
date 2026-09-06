import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Promotion } from '@/models';
import { handleApiError } from '@/lib/error-handler';
import { serializePromotion } from '@/lib/promotions';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withPermission('manage_promotions')(async () => {
    try {
      await connectDB();

      const promotion = await Promotion.findById(id);
      if (!promotion) {
        return NextResponse.json(
          { success: false, error: 'Promotion not found' },
          { status: 404 }
        );
      }

      if (promotion.status !== 'active') {
        return NextResponse.json(
          { success: false, error: `Cannot pause a promotion with status "${promotion.status}"` },
          { status: 400 }
        );
      }

      promotion.status = 'paused';
      await promotion.save();

      return NextResponse.json({
        success: true,
        data: await serializePromotion(promotion.toObject()),
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
