import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { POST as createAdjustment } from '@/app/api/stock-adjustments/route';
import { POST as approveAdjustment } from '@/app/api/stock-adjustments/[id]/approve/route';
import { POST as rejectAdjustment } from '@/app/api/stock-adjustments/[id]/reject/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { StockAdjustment, Product } from '@/models';

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
  StockAdjustment: { find: jest.fn(), findById: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn() },
  Product: { findById: jest.fn() },
}));

jest.mock('@/models/ActivityLog', () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return { ...actual, startSession: jest.fn() };
});

// Chainable+thenable query stand-in: `.session()` returns itself, and the
// object resolves to `result` regardless of whether `.session()` was called
// first - matching every real call shape used by the approve route.
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

function mockTransactionalSession() {
  (mongoose.startSession as jest.Mock).mockResolvedValue({
    withTransaction: (fn: () => Promise<unknown>) => fn(),
    endSession: jest.fn().mockResolvedValue(undefined),
  });
}

interface MockAdjustment {
  status: string;
  adjustmentType?: 'increase' | 'decrease';
  quantity?: number;
  productId?: string;
  previousStock?: number;
  newStock?: number;
  reviewedById?: string;
  toObject?: () => Record<string, unknown>;
  _id?: { toString: () => string };
  createdAt?: Date;
  save: jest.Mock;
}

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

describe('POST /api/stock-adjustments (create)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a pending adjustment without touching product stock', async () => {
    mockSession('manager');
    const product = { _id: 'prod-1', name: 'Widget', stockQuantity: 100, save: jest.fn() };
    (Product.findById as jest.Mock).mockResolvedValue(product);
    (StockAdjustment.create as jest.Mock).mockResolvedValue({
      toObject: () => ({ status: 'pending' }),
      _id: { toString: () => 'adj-1' },
      createdAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-1', adjustmentType: 'decrease', quantity: 10, reason: 'Damaged' }),
    });
    const response = await createAdjustment(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('pending');
    expect(product.save).not.toHaveBeenCalled();
    expect(StockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', previousStock: 100, newStock: 90 })
    );
  });

  it('rejects a decrease request that would go negative', async () => {
    mockSession('manager');
    (Product.findById as jest.Mock).mockResolvedValue({ _id: 'prod-1', name: 'Widget', stockQuantity: 5, save: jest.fn() });

    const request = new NextRequest('http://localhost/api/stock-adjustments', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod-1', adjustmentType: 'decrease', quantity: 10, reason: 'Damaged' }),
    });
    const response = await createAdjustment(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(StockAdjustment.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/stock-adjustments/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionalSession();
  });

  it('rejects roles without approve_stock_adjustments', async () => {
    mockSession('cashier');
    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await approveAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });
    expect(response.status).toBe(403);
  });

  it('applies the stock change against the live product quantity, not the stale estimate', async () => {
    mockSession('admin');
    const adjustment: MockAdjustment = {
      status: 'pending',
      adjustmentType: 'decrease',
      quantity: 10,
      productId: 'prod-1',
      previousStock: 100, // stale estimate from request time
      newStock: 90,
      toObject: () => ({}),
      _id: { toString: () => 'adj-1' },
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    (StockAdjustment.findById as jest.Mock).mockReturnValue(chainable(adjustment));
    // Stock moved to 50 since the request was made (e.g. a sale happened).
    const product = { stockQuantity: 50, name: 'Widget', save: jest.fn().mockResolvedValue(undefined) };
    (Product.findById as jest.Mock).mockReturnValue(chainable(product));

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await approveAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(product.stockQuantity).toBe(40); // 50 - 10, not 90
    expect(product.save).toHaveBeenCalledTimes(1);
    expect(adjustment.status).toBe('approved');
    expect(adjustment.previousStock).toBe(50);
    expect(adjustment.newStock).toBe(40);
    expect(adjustment.reviewedById).toBe('user-1');
  });

  it('rejects approving a non-pending adjustment', async () => {
    mockSession('admin');
    (StockAdjustment.findById as jest.Mock).mockReturnValue(chainable({ status: 'approved' }));

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await approveAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });
    expect(response.status).toBe(400);
  });

  it('never applies the stock delta twice: a second approval attempt that observes the already-approved status is rejected', async () => {
    // In production this "already approved" read is exactly what a retried
    // transaction sees after losing a write-conflict race against the
    // request that approved first - see the route's own comment. This test
    // exercises that same business-rule branch directly.
    mockSession('admin');
    (StockAdjustment.findById as jest.Mock).mockReturnValue(chainable({ status: 'approved' }));

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await approveAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });

    expect(response.status).toBe(400);
    expect(Product.findById).not.toHaveBeenCalled();
  });

  it('blocks approval that would drive stock negative', async () => {
    mockSession('admin');
    const adjustment: MockAdjustment = {
      status: 'pending',
      adjustmentType: 'decrease',
      quantity: 100,
      productId: 'prod-1',
      save: jest.fn(),
    };
    (StockAdjustment.findById as jest.Mock).mockReturnValue(chainable(adjustment));
    (Product.findById as jest.Mock).mockReturnValue(chainable({ stockQuantity: 5, name: 'Widget', save: jest.fn() }));

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await approveAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });

    expect(response.status).toBe(400);
    expect(adjustment.save).not.toHaveBeenCalled();
  });
});

describe('POST /api/stock-adjustments/[id]/reject', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a pending adjustment without touching any product', async () => {
    mockSession('admin');
    const adjustment: MockAdjustment = {
      status: 'rejected', // the post-update document, since findOneAndUpdate uses {new: true}
      save: jest.fn(),
      toObject: () => ({}),
      _id: { toString: () => 'adj-1' },
      createdAt: new Date(),
    };
    (StockAdjustment.findOneAndUpdate as jest.Mock).mockResolvedValue(adjustment);

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await rejectAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(StockAdjustment.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'adj-1', status: 'pending' },
      expect.objectContaining({ status: 'rejected' }),
      { new: true }
    );
    expect(Product.findById).not.toHaveBeenCalled();
  });

  it('rejects re-rejecting a non-pending adjustment', async () => {
    mockSession('admin');
    // The compare-and-swap doesn't match a non-pending adjustment.
    (StockAdjustment.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (StockAdjustment.findById as jest.Mock).mockResolvedValue({ status: 'rejected' });

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await rejectAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });
    expect(response.status).toBe(400);
  });

  it('never double-processes when reject loses a race against a concurrent approval', async () => {
    mockSession('admin');
    // Another request already approved it - the CAS finds no matching
    // 'pending' document.
    (StockAdjustment.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (StockAdjustment.findById as jest.Mock).mockResolvedValue({ status: 'approved' });

    const request = new NextRequest('http://localhost/x', { method: 'POST' });
    const response = await rejectAdjustment(request, { params: Promise.resolve({ id: 'adj-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/approved/);
  });
});
