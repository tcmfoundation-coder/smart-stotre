import { createSale } from '@/lib/actions/pos';
import { requireAuth } from '@/lib/security';
import { Sale, Product, Transaction } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/activity-log', () => ({
  logActivity: jest.fn(),
}));

jest.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: jest.fn(),
}));

jest.mock('@/lib/whatsapp-utils', () => ({
  generateThankYouMessage: jest.fn().mockReturnValue('Thanks!'),
}));

jest.mock('@/models', () => ({
  Sale: { create: jest.fn() },
  Product: { findById: jest.fn() },
  Customer: { findOne: jest.fn(), create: jest.fn() },
  Transaction: { create: jest.fn() },
  Loyalty: { findOne: jest.fn(), create: jest.fn() },
}));

function mockProduct(overrides: Partial<{ _id: string; name: string; sku: string; buyingPrice: number; sellingPrice: number; stockQuantity: number; minStockLevel: number }> = {}) {
  const product = {
    _id: overrides._id ?? 'product-1',
    name: overrides.name ?? 'Widget',
    sku: overrides.sku ?? 'WID-1',
    buyingPrice: overrides.buyingPrice ?? 500,
    sellingPrice: overrides.sellingPrice ?? 1000,
    stockQuantity: overrides.stockQuantity ?? 50,
    minStockLevel: overrides.minStockLevel ?? 5,
    save: jest.fn().mockResolvedValue(undefined),
  };
  return product;
}

describe('createSale price integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue({ id: 'cashier-1', name: 'Cashier Joe', role: 'cashier', branchId: 'branch-1' });
    (Sale.create as jest.Mock).mockImplementation(async (doc) => ({
      ...doc,
      _id: 'sale-1',
      toString: () => 'sale-1',
    }));
    (Transaction.create as jest.Mock).mockResolvedValue({});
  });

  it('ignores a client-supplied price and charges the real product sellingPrice', async () => {
    const product = mockProduct({ sellingPrice: 1000, buyingPrice: 500 });
    (Product.findById as jest.Mock).mockResolvedValue(product);

    const sale = await createSale({
      items: [{ productId: 'product-1', quantity: 2, price: 0.01 }],
      paymentMethod: 'cash',
    } as any);

    // 2 * real sellingPrice (1000), not 2 * the fabricated price (0.01).
    expect(sale.subtotal).toBe(2000);
    expect(sale.total).toBe(2000);
    expect(sale.items[0].sellingPrice).toBe(1000);
    expect(sale.items[0].total).toBe(2000);
  });

  it('still charges the real price when no price field is sent at all', async () => {
    const product = mockProduct({ sellingPrice: 250 });
    (Product.findById as jest.Mock).mockResolvedValue(product);

    const sale = await createSale({
      items: [{ productId: 'product-1', quantity: 3 }],
      paymentMethod: 'cash',
    } as any);

    expect(sale.total).toBe(750);
  });

  it('decrements real stock regardless of the fabricated price', async () => {
    const product = mockProduct({ stockQuantity: 10 });
    (Product.findById as jest.Mock).mockResolvedValue(product);

    await createSale({
      items: [{ productId: 'product-1', quantity: 4, price: 999999 }],
      paymentMethod: 'cash',
    } as any);

    expect(product.stockQuantity).toBe(6);
    expect(product.save).toHaveBeenCalled();
  });
});
