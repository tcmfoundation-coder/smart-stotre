import mongoose from 'mongoose';
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
  Product: { findById: jest.fn(), findOneAndUpdate: jest.fn() },
  Customer: { findOne: jest.fn(), create: jest.fn() },
  Transaction: { create: jest.fn() },
  Loyalty: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, startSession: jest.fn() };
});

// Minimal chainable+thenable query stand-in, matching the shape used by the
// goods-receipt routes' own tests: `.session()` just returns itself, and the
// object resolves to `result` however deep the (real) call chains into it.
interface ChainableQuery<T> {
  session: jest.Mock;
  then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
}

function chainable<T>(result: T): ChainableQuery<T> {
  const query = {
    session: jest.fn(),
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  } as ChainableQuery<T>;
  query.session.mockReturnValue(query);
  return query;
}

interface MockProduct {
  _id: string;
  name: string;
  sku: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel: number;
}

interface SaleItemResult {
  sellingPrice: number;
  total: number;
}

interface SaleResult {
  subtotal: number;
  total: number;
  items: SaleItemResult[];
}

function mockProduct(overrides: Partial<MockProduct> = {}): MockProduct {
  return {
    _id: overrides._id ?? 'product-1',
    name: overrides.name ?? 'Widget',
    sku: overrides.sku ?? 'WID-1',
    buyingPrice: overrides.buyingPrice ?? 500,
    sellingPrice: overrides.sellingPrice ?? 1000,
    stockQuantity: overrides.stockQuantity ?? 50,
    minStockLevel: overrides.minStockLevel ?? 5,
  };
}

// Simulates the real atomic `findOneAndUpdate({ stockQuantity: { $gte } }, { $inc })`
// against an in-memory product: mutates `product.stockQuantity` and returns
// the updated product, or null if the guard condition wouldn't have matched -
// exactly mirroring what MongoDB itself would do.
function mockAtomicStockDecrement(product: MockProduct) {
  (Product.findOneAndUpdate as jest.Mock).mockImplementation(async (query, update) => {
    const requiredAtLeast = query?.stockQuantity?.$gte ?? 0;
    if (product.stockQuantity < requiredAtLeast) {
      return null;
    }
    product.stockQuantity += update.$inc.stockQuantity;
    return product;
  });
}

function mockTransactionalSession() {
  (mongoose.startSession as jest.Mock).mockResolvedValue({
    withTransaction: (fn: () => Promise<unknown>) => fn(),
    endSession: jest.fn().mockResolvedValue(undefined),
  });
}

describe('createSale price integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionalSession();
    (requireAuth as jest.Mock).mockResolvedValue({ id: 'cashier-1', name: 'Cashier Joe', role: 'cashier', branchId: 'branch-1' });
    (Sale.create as jest.Mock).mockImplementation(async (docs: unknown[]) => [
      { ...(docs[0] as Record<string, unknown>), _id: 'sale-1', toString: () => 'sale-1' },
    ]);
    (Transaction.create as jest.Mock).mockResolvedValue({});
  });

  it('ignores a client-supplied price and charges the real product sellingPrice', async () => {
    const product = mockProduct({ sellingPrice: 1000, buyingPrice: 500 });
    (Product.findById as jest.Mock).mockReturnValue(chainable(product));
    mockAtomicStockDecrement(product);

    const sale = (await createSale({
      items: [{ productId: 'product-1', quantity: 2, price: 0.01 }],
      paymentMethod: 'cash',
    })) as unknown as SaleResult;

    // 2 * real sellingPrice (1000), not 2 * the fabricated price (0.01).
    expect(sale.subtotal).toBe(2000);
    expect(sale.total).toBe(2000);
    expect(sale.items[0].sellingPrice).toBe(1000);
    expect(sale.items[0].total).toBe(2000);
  });

  it('still charges the real price when no price field is sent at all', async () => {
    const product = mockProduct({ sellingPrice: 250 });
    (Product.findById as jest.Mock).mockReturnValue(chainable(product));
    mockAtomicStockDecrement(product);

    const sale = (await createSale({
      items: [{ productId: 'product-1', quantity: 3 }],
      paymentMethod: 'cash',
    })) as unknown as SaleResult;

    expect(sale.total).toBe(750);
  });

  it('decrements real stock regardless of the fabricated price', async () => {
    const product = mockProduct({ stockQuantity: 10 });
    (Product.findById as jest.Mock).mockReturnValue(chainable(product));
    mockAtomicStockDecrement(product);

    await createSale({
      items: [{ productId: 'product-1', quantity: 4, price: 999999 }],
      paymentMethod: 'cash',
    });

    expect(product.stockQuantity).toBe(6);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'product-1', stockQuantity: { $gte: 4 } },
      { $inc: { stockQuantity: -4 } },
      expect.objectContaining({ new: true, session: expect.anything() })
    );
  });

  it.each([-5, 0, 1.5])(
    'rejects a non-positive or fractional quantity (%s) before touching stock or creating a sale',
    async (quantity) => {
      const product = mockProduct({ stockQuantity: 10 });
      (Product.findById as jest.Mock).mockReturnValue(chainable(product));
      mockAtomicStockDecrement(product);

      await expect(
        createSale({
          items: [{ productId: 'product-1', quantity }],
          paymentMethod: 'cash',
        })
      ).rejects.toThrow(/positive whole number/);

      expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
      expect(Sale.create).not.toHaveBeenCalled();
    }
  );

  it('rejects a sale with no items rather than silently recording a zero-value sale', async () => {
    await expect(
      createSale({ items: [], paymentMethod: 'cash' })
    ).rejects.toThrow(/At least one item/);

    expect(Sale.create).not.toHaveBeenCalled();
  });

  it('rejects the sale atomically when concurrent stock has already dropped below what is needed', async () => {
    // Stock is nominally 10 per the initial read, but the atomic guard is what
    // actually governs correctness - simulate another transaction having
    // already consumed enough of it that only 2 remain by the time this
    // transaction's write executes.
    const product = mockProduct({ stockQuantity: 10 });
    (Product.findById as jest.Mock).mockReturnValue(chainable(product));
    (Product.findOneAndUpdate as jest.Mock).mockImplementation(async () => null);

    await expect(
      createSale({
        items: [{ productId: 'product-1', quantity: 4 }],
        paymentMethod: 'cash',
      })
    ).rejects.toThrow(/Insufficient stock/);

    expect(Sale.create).not.toHaveBeenCalled();
  });

  it('never creates a Sale (or applies loyalty/notification side effects) when a later item in the same sale is out of stock', async () => {
    // This is the atomicity boundary the transaction exists for: creating a
    // Sale record with items 1..N-1 already decremented but item N rejected
    // would be a real orphaned-decrement bug. A mocked single-call
    // `withTransaction` can't reproduce MongoDB's actual write rollback, but
    // it can and does prove the important application-level invariant: this
    // function never reaches Sale.create - and therefore no half-applied
    // sale is ever visible to the rest of the app - once any item fails.
    const widget = mockProduct({ _id: 'product-1', name: 'Widget', stockQuantity: 10 });
    const gadget = mockProduct({ _id: 'product-2', name: 'Gadget', stockQuantity: 1 });

    (Product.findById as jest.Mock).mockImplementation((id: string) =>
      chainable(id === 'product-1' ? widget : gadget)
    );
    (Product.findOneAndUpdate as jest.Mock).mockImplementation(async (query, update) => {
      const product = query._id === 'product-1' ? widget : gadget;
      const requiredAtLeast = query.stockQuantity.$gte;
      if (product.stockQuantity < requiredAtLeast) return null;
      product.stockQuantity += update.$inc.stockQuantity;
      return product;
    });

    await expect(
      createSale({
        items: [
          { productId: 'product-1', quantity: 3 },
          { productId: 'product-2', quantity: 5 }, // only 1 in stock
        ],
        paymentMethod: 'cash',
      })
    ).rejects.toThrow(/Insufficient stock/);

    expect(Sale.create).not.toHaveBeenCalled();
  });
});
