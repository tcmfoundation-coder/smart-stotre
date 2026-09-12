import { updateStock } from '@/lib/actions/inventory';
import { requireManagerOrAdmin } from '@/lib/security';
import { Product, Notification } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/models', () => ({
  Product: { findOneAndUpdate: jest.fn(), findById: jest.fn() },
  Notification: { create: jest.fn().mockResolvedValue(undefined) },
}));

describe('updateStock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireManagerOrAdmin as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'admin' });
  });

  it('applies an atomic guarded increment for "add"', async () => {
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'p1',
      name: 'Widget',
      stockQuantity: 60,
      minStockLevel: 10,
    });

    const result = await updateStock('p1', 10, 'add');

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'p1' },
      { $inc: { stockQuantity: 10 } },
      { new: true }
    );
    expect(result.stockQuantity).toBe(60);
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it('applies an atomic guarded decrement for "subtract", only matching if enough stock remains', async () => {
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'p1',
      name: 'Widget',
      stockQuantity: 40,
      minStockLevel: 10,
    });

    await updateStock('p1', 10, 'subtract');

    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'p1', stockQuantity: { $gte: 10 } },
      { $inc: { stockQuantity: -10 } },
      { new: true }
    );
  });

  it('rejects a subtract that would drive stock negative, without ever calling save on a stale read', async () => {
    // The atomic guard is what actually enforces this: the update matches
    // nothing once real stock is insufficient, regardless of what a plain
    // (non-atomic) prior read might have shown.
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (Product.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'p1' }) });

    await expect(updateStock('p1', 100, 'subtract')).rejects.toThrow('Insufficient stock');
  });

  it('reports product not found distinctly from insufficient stock', async () => {
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (Product.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(updateStock('missing', 5, 'subtract')).rejects.toThrow('Product not found');
  });

  it.each([
    [0, 'add'],
    [-5, 'add'],
    [1.5, 'add'],
    [-1, 'subtract'],
  ] as const)('rejects a non-positive or fractional quantity (%s, %s) before touching the database', async (quantity, operation) => {
    await expect(updateStock('p1', quantity, operation)).rejects.toThrow(/positive whole number/);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('creates a low-stock notification only once stock actually drops to or below the minimum', async () => {
    (Product.findOneAndUpdate as jest.Mock).mockResolvedValue({
      _id: 'p1',
      name: 'Widget',
      stockQuantity: 4,
      minStockLevel: 5,
    });

    await updateStock('p1', 6, 'subtract');

    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Low Stock Alert' })
    );
  });
});
