import { Types } from 'mongoose';
import { Category, Product } from '@/models';
import { IPromotion } from '@/models/Promotion';

type LeanPromotion = Omit<IPromotion, keyof import('mongoose').Document> & { _id: Types.ObjectId | string };

// A promotion whose endDate has passed is always "expired" for display,
// regardless of its stored status (which only tracks active/paused/scheduled).
export function effectiveStatus(promo: Pick<IPromotion, 'status' | 'startDate' | 'endDate'>): string {
  const now = new Date();
  if (promo.endDate && new Date(promo.endDate) < now) {
    return 'expired';
  }
  if (promo.status === 'active' && new Date(promo.startDate) > now) {
    return 'scheduled';
  }
  return promo.status;
}

export async function serializePromotion(promo: LeanPromotion) {
  const [categories, products] = await Promise.all([
    promo.categoryIds?.length
      ? Category.find({ _id: { $in: promo.categoryIds } }).select('name').lean()
      : [],
    promo.productIds?.length
      ? Product.find({ _id: { $in: promo.productIds } }).select('name').lean()
      : [],
  ]);

  return {
    ...promo,
    _id: promo._id.toString(),
    categories: categories.map((c) => c.name),
    products: products.map((p) => p.name),
    effectiveStatus: effectiveStatus(promo),
  };
}
