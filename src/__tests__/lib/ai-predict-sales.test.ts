import mongoose from 'mongoose';
import { predictSales } from '@/lib/actions/ai';
import { requireAuth } from '@/lib/security';
import { Sale, Product } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models', () => ({
  Sale: { aggregate: jest.fn() },
  Product: { findById: jest.fn() },
  Expense: {},
  Customer: {},
  AIReport: {},
}));

describe('predictSales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'admin' });
  });

  it('rejects a non-ObjectId productId before querying the database', async () => {
    await expect(predictSales('not-a-real-id')).rejects.toThrow('Invalid product id');
    expect(Sale.aggregate).not.toHaveBeenCalled();
  });

  it('matches items.productId against a real ObjectId, not a raw string', async () => {
    const validId = '507f1f77bcf86cd799439011';
    (Sale.aggregate as jest.Mock).mockResolvedValue([]);
    (Product.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue({ sellingPrice: 20 }) });

    await predictSales(validId, 30);

    const pipeline = (Sale.aggregate as jest.Mock).mock.calls[0][0];
    const matchStage = pipeline.find((stage: Record<string, unknown>) => {
      const match = stage.$match as Record<string, unknown> | undefined;
      return match?.['items.productId'];
    });
    const matchedValue = matchStage.$match['items.productId'];

    expect(matchedValue).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(matchedValue.toString()).toBe(validId);
  });
});
