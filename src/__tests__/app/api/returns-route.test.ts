import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/returns/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { Sale, Product, Return } from '@/models';

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
  Sale: { findById: jest.fn() },
  Product: { findByIdAndUpdate: jest.fn() },
  Return: { find: jest.fn(), create: jest.fn() },
}));

jest.mock('@/models/ActivityLog', () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue(undefined) },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function makeSale(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 'sale-1',
    saleNumber: 'SALE-100',
    status: 'completed',
    total: 200,
    customerId: undefined,
    customerName: 'Walk-in',
    items: [
      {
        productId: { toString: () => 'prod-1' },
        productName: 'Widget',
        sku: 'WID-1',
        quantity: 4,
        total: 200, // unit price 50
      },
    ],
    ...overrides,
  };
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/returns', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/returns', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects roles without process_returns is impossible - all roles have it, so verify a real create instead', async () => {
    // process_returns is granted to admin/manager/cashier - this asserts a
    // cashier (the least-privileged holder) can actually process a return.
    mockSession('cashier');
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale());
    (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    (Return.create as jest.Mock).mockResolvedValue({
      toObject: () => ({}),
      _id: { toString: () => 'ret-1' },
      createdAt: new Date(),
    });

    const response = await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 2, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });

  it('caps refund at the original sale price and quantity (partial return)', async () => {
    mockSession('cashier');
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale());
    (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    (Return.create as jest.Mock).mockResolvedValue({
      toObject: () => ({}),
      _id: { toString: () => 'ret-1' },
      createdAt: new Date(),
    });

    await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 2, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );

    const createCall = (Return.create as jest.Mock).mock.calls[0][0];
    // 2 of 4 units at $50/unit (200 total / 4 qty) = $100
    expect(createCall.totalRefund).toBe(100);
    expect(createCall.items[0].unitRefundPrice).toBe(50);
    expect(createCall.items[0].refundAmount).toBe(100);
  });

  it('restocks inventory only for items marked restock', async () => {
    mockSession('cashier');
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale());
    (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    (Return.create as jest.Mock).mockResolvedValue({
      toObject: () => ({}),
      _id: { toString: () => 'ret-1' },
      createdAt: new Date(),
    });

    await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 1, reason: 'Damaged', restock: false }],
        refundMethod: 'cash',
      })
    );

    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects returning more than was originally sold', async () => {
    mockSession('cashier');
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale());
    (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const response = await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 10, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(Return.create).not.toHaveBeenCalled();
  });

  it('accounts for quantity already returned in prior partial returns', async () => {
    mockSession('cashier');
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale());
    // 3 of the 4 units were already returned in an earlier return.
    (Return.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { totalRefund: 150, items: [{ productId: { toString: () => 'prod-1' }, quantity: 3 }] },
      ]),
    });

    const response = await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 2, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/only 1 remaining returnable/);
  });

  it('rejects a refund that would exceed the amount originally paid', async () => {
    mockSession('cashier');
    // Sale total is 200, but somehow the requested items would refund more
    // than that (guards against a corrupted/negative-total edge case).
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale({ total: 50 }));
    (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const response = await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 4, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/exceed the amount paid/);
  });

  it('rejects a return against a non-completed sale', async () => {
    mockSession('cashier');
    (Sale.findById as jest.Mock).mockResolvedValue(makeSale({ status: 'pending' }));

    const response = await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 1, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );

    expect(response.status).toBe(400);
    expect(Return.create).not.toHaveBeenCalled();
  });

  it('never mutates the original sale record', async () => {
    mockSession('cashier');
    const sale = makeSale();
    (Sale.findById as jest.Mock).mockResolvedValue(sale);
    (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    (Return.create as jest.Mock).mockResolvedValue({
      toObject: () => ({}),
      _id: { toString: () => 'ret-1' },
      createdAt: new Date(),
    });

    await POST(
      makePostRequest({
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', quantity: 1, reason: 'Damaged' }],
        refundMethod: 'cash',
      })
    );

    // Sale has no .save() call anywhere in the return flow - it is only read.
    expect((sale as Record<string, unknown>).save).toBeUndefined();
    expect(sale.total).toBe(200);
    expect(sale.items[0].quantity).toBe(4);
  });
});

describe('GET /api/returns', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists returns for an authorized role', async () => {
    mockSession('manager');
    (Return.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: { toString: () => 'ret-1' }, returnNumber: 'RET-1', createdAt: new Date() },
      ]),
    });

    const request = new NextRequest('http://localhost/api/returns');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
  });
});
