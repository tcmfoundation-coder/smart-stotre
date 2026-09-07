import { NextRequest } from 'next/server';
import { GET as getInventoryReports } from '@/app/api/inventory-reports/route';
import { GET as getMovements } from '@/app/api/inventory-reports/movements/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { Product, Sale, StockAdjustment, Return } from '@/models';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock('@/models', () => ({
  Product: { find: jest.fn() },
  Sale: { find: jest.fn() },
  StockAdjustment: { find: jest.fn() },
  Return: { find: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function leanFind(mockFn: jest.Mock, result: unknown) {
  mockFn.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  });
}

const productId = '507f1f77bcf86cd799439011';
const categoryId = '507f1f77bcf86cd799439099';

describe('GET /api/inventory-reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes turnover from real sales COGS and reconstructed average inventory', async () => {
    mockSession('manager');

    // Current on-hand: 40 units at buyingPrice 100 => ending value 4000.
    leanFind(Product.find as jest.Mock, [
      { _id: { toString: () => productId }, name: 'Widget', categoryId: { _id: { toString: () => categoryId }, name: 'Gadgets' }, buyingPrice: 100, stockQuantity: 40, minStockLevel: 10 },
    ]);

    // One sale of 10 units after `start` (also within the period) - reversing
    // it means beginning inventory was 10 units higher than ending.
    const saleRow = {
      _id: { toString: () => 'sale-1' },
      createdAt: new Date(),
      items: [{ productId: { toString: () => productId }, quantity: 10, buyingPrice: 100 }],
    };
    (Sale.find as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([saleRow]) }) // salesAfterStart
      .mockReturnValueOnce({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([saleRow]) }); // salesInPeriod

    leanFind(StockAdjustment.find as jest.Mock, []);
    leanFind(Return.find as jest.Mock, []);

    const request = new NextRequest('http://localhost/api/inventory-reports?dateRange=month');
    const response = await getInventoryReports(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    // Ending value: 40 * 100 = 4000. Beginning value: (40+10) * 100 = 5000.
    expect(payload.data.metrics.totalInventoryValue).toBe(4000);
    expect(payload.data.metrics.averageInventoryValue).toBe(4500);
    expect(payload.data.metrics.cogs).toBe(1000);
    expect(payload.data.metrics.turnoverRatio).toBeCloseTo(1000 / 4500);
    expect(payload.data.limitations.length).toBeGreaterThan(0);
  });

  it('flags low stock and out of stock counts using each product\'s own minStockLevel', async () => {
    mockSession('admin');

    leanFind(Product.find as jest.Mock, [
      { _id: { toString: () => 'p1' }, name: 'A', categoryId: { _id: { toString: () => 'c1' }, name: 'Cat' }, buyingPrice: 10, stockQuantity: 0, minStockLevel: 5 },
      { _id: { toString: () => 'p2' }, name: 'B', categoryId: { _id: { toString: () => 'c1' }, name: 'Cat' }, buyingPrice: 10, stockQuantity: 3, minStockLevel: 5 },
      { _id: { toString: () => 'p3' }, name: 'C', categoryId: { _id: { toString: () => 'c1' }, name: 'Cat' }, buyingPrice: 10, stockQuantity: 20, minStockLevel: 5 },
    ]);
    (Sale.find as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) });
    leanFind(StockAdjustment.find as jest.Mock, []);
    leanFind(Return.find as jest.Mock, []);

    const request = new NextRequest('http://localhost/api/inventory-reports?dateRange=month');
    const response = await getInventoryReports(request);
    const payload = await response.json();

    expect(payload.data.metrics.outOfStockCount).toBe(1);
    expect(payload.data.metrics.lowStockCount).toBe(1);
  });

  it('rejects a cashier (no view_inventory_reports permission)', async () => {
    mockSession('cashier');

    const request = new NextRequest('http://localhost/api/inventory-reports?dateRange=month');
    const response = await getInventoryReports(request);

    expect(response.status).toBe(403);
  });
});

describe('GET /api/inventory-reports/movements', () => {
  beforeEach(() => jest.clearAllMocks());

  it('merges sales, approved adjustments, and restocked returns into one sorted feed', async () => {
    mockSession('manager');

    const now = new Date();
    const earlier = new Date(now.getTime() - 60_000);
    const earliest = new Date(now.getTime() - 120_000);

    (Sale.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'sale-1' },
          saleNumber: 'SALE-001',
          createdAt: now,
          cashierId: { name: 'Cashier Joe' },
          items: [{ productId: { toString: () => productId }, productName: 'Widget', sku: 'WID-1', quantity: 5 }],
        },
      ]),
    });
    (StockAdjustment.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'adj-1' },
          productId: { toString: () => productId },
          productName: 'Widget',
          adjustmentType: 'increase',
          quantity: 8,
          reviewedAt: earlier,
          reviewedBy: 'Manager Mo',
          performedBy: 'Cashier Joe',
          reason: 'Stock count correction',
        },
      ]),
    });
    (Return.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'ret-1' },
          returnNumber: 'RET-001',
          createdAt: earliest,
          processedBy: 'Cashier Joe',
          items: [{ productId: { toString: () => productId }, productName: 'Widget', sku: 'WID-1', quantity: 2, restocked: true }],
        },
      ]),
    });

    const request = new NextRequest('http://localhost/api/inventory-reports/movements?dateRange=month');
    const response = await getMovements(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    const movements = payload.data.movements;
    expect(movements).toHaveLength(3);
    expect(movements.map((m: { type: string }) => m.type)).toEqual(['SALE', 'ADJUSTMENT', 'RETURN']);
    expect(movements[0].quantityChange).toBe(-5);
    expect(movements[1].quantityChange).toBe(8);
    expect(movements[2].quantityChange).toBe(2);
    expect(payload.data.notes.length).toBeGreaterThan(0);
  });

  it('excludes returned items that were not restocked', async () => {
    mockSession('admin');

    (Sale.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (StockAdjustment.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (Return.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'ret-1' },
          returnNumber: 'RET-001',
          createdAt: new Date(),
          processedBy: 'Cashier Joe',
          items: [{ productId: { toString: () => productId }, productName: 'Widget', sku: 'WID-1', quantity: 2, restocked: false }],
        },
      ]),
    });

    const request = new NextRequest('http://localhost/api/inventory-reports/movements?dateRange=month');
    const response = await getMovements(request);
    const payload = await response.json();

    expect(payload.data.movements).toHaveLength(0);
  });

  it('filters by type', async () => {
    mockSession('manager');

    (Sale.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (StockAdjustment.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'adj-1' },
          productId: { toString: () => productId },
          productName: 'Widget',
          adjustmentType: 'decrease',
          quantity: 3,
          reviewedAt: new Date(),
          reviewedBy: 'Manager Mo',
          performedBy: 'Cashier Joe',
          reason: 'Damaged goods',
        },
      ]),
    });
    (Return.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const request = new NextRequest('http://localhost/api/inventory-reports/movements?dateRange=month&type=ADJUSTMENT');
    const response = await getMovements(request);
    const payload = await response.json();

    expect(payload.data.movements).toHaveLength(1);
    expect(payload.data.movements[0].type).toBe('ADJUSTMENT');
    expect(payload.data.movements[0].quantityChange).toBe(-3);
    expect(Sale.find).not.toHaveBeenCalled();
    expect(Return.find).not.toHaveBeenCalled();
  });
});
