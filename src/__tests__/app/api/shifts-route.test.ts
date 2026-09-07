import { NextRequest } from 'next/server';
import { POST as openShift } from '@/app/api/shifts/open/route';
import { GET as getCurrentShift } from '@/app/api/shifts/current/route';
import { POST as closeShift } from '@/app/api/shifts/[id]/close/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { Shift, Sale, Return } from '@/models';

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
  Shift: { findOne: jest.fn(), findById: jest.fn(), create: jest.fn() },
  Sale: { find: jest.fn() },
  Return: { find: jest.fn() },
}));

function mockSession(role: string, id = 'user-1') {
  (auth as jest.Mock).mockResolvedValue({
    user: { id, email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function mockLiveData(sales: unknown[], returns: unknown[]) {
  (Sale.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(sales) });
  (Return.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(returns) });
}

describe('POST /api/shifts/open', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens a shift for a cashier', async () => {
    mockSession('cashier');
    (Shift.findOne as jest.Mock).mockResolvedValue(null);
    (Shift.create as jest.Mock).mockResolvedValue({
      toObject: () => ({ status: 'open' }),
      _id: { toString: () => 'shift-1' },
    });

    const request = new NextRequest('http://localhost/api/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ openingCashBalance: 5000 }),
    });
    const response = await openShift(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe('open');
  });

  it('rejects opening a second shift while one is already open', async () => {
    mockSession('cashier');
    (Shift.findOne as jest.Mock).mockResolvedValue({ status: 'open' });

    const request = new NextRequest('http://localhost/api/shifts/open', {
      method: 'POST',
      body: JSON.stringify({ openingCashBalance: 5000 }),
    });
    const response = await openShift(request);

    expect(response.status).toBe(400);
    expect(Shift.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/shifts/current', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when there is no open shift', async () => {
    mockSession('cashier');
    (Shift.findOne as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/shifts/current');
    const response = await getCurrentShift(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toBeNull();
  });

  it('computes live sales/refund totals for the open shift', async () => {
    mockSession('cashier');
    (Shift.findOne as jest.Mock).mockResolvedValue({
      toObject: () => ({ openingCashBalance: 1000 }),
      _id: { toString: () => 'shift-1' },
      openedAt: new Date(),
      openingCashBalance: 1000,
    });
    mockLiveData(
      [{ total: 500, paymentMethod: 'cash' }, { total: 300, paymentMethod: 'card' }],
      [{ totalRefund: 50, refundMethod: 'cash' }]
    );

    const request = new NextRequest('http://localhost/api/shifts/current');
    const response = await getCurrentShift(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.salesTotal).toBe(800);
    expect(payload.data.salesCount).toBe(2);
    expect(payload.data.refundsTotal).toBe(50);
    // expectedCash = opening (1000) + cash sales (500) - cash refunds (50) = 1450
    expect(payload.data.expectedCash).toBe(1450);
  });
});

describe('POST /api/shifts/[id]/close', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects closing someone else\'s shift as a cashier', async () => {
    mockSession('cashier', 'user-2');
    (Shift.findById as jest.Mock).mockResolvedValue({
      status: 'open',
      openedBy: { toString: () => 'user-1' },
    });

    const request = new NextRequest('http://localhost/x', {
      method: 'POST',
      body: JSON.stringify({ actualCash: 1000 }),
    });
    const response = await closeShift(request, { params: Promise.resolve({ id: 'shift-1' }) });

    expect(response.status).toBe(403);
  });

  it('allows a manager to close another user\'s shift', async () => {
    mockSession('manager', 'user-2');
    const shift = {
      status: 'open',
      openedBy: { toString: () => 'user-1' },
      openedAt: new Date(),
      openingCashBalance: 1000,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({}),
      _id: { toString: () => 'shift-1' },
    };
    (Shift.findById as jest.Mock).mockResolvedValue(shift);
    mockLiveData([{ total: 200, paymentMethod: 'cash' }], []);

    const request = new NextRequest('http://localhost/x', {
      method: 'POST',
      body: JSON.stringify({ actualCash: 1200 }),
    });
    const response = await closeShift(request, { params: Promise.resolve({ id: 'shift-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(shift.status).toBe('closed');
  });

  it('computes cash variance as actual minus expected', async () => {
    mockSession('cashier', 'user-1');
    const shift = {
      status: 'open',
      openedBy: { toString: () => 'user-1' },
      openedAt: new Date(),
      openingCashBalance: 1000,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: () => ({}),
      _id: { toString: () => 'shift-1' },
    };
    (Shift.findById as jest.Mock).mockResolvedValue(shift);
    // expected: 1000 opening + 500 cash sales = 1500
    mockLiveData([{ total: 500, paymentMethod: 'cash' }], []);

    const request = new NextRequest('http://localhost/x', {
      method: 'POST',
      body: JSON.stringify({ actualCash: 1480 }),
    });
    await closeShift(request, { params: Promise.resolve({ id: 'shift-1' }) });

    expect((shift as unknown as { expectedCash: number }).expectedCash).toBe(1500);
    expect((shift as unknown as { actualCash: number }).actualCash).toBe(1480);
    expect((shift as unknown as { cashVariance: number }).cashVariance).toBe(-20);
  });

  it('rejects closing an already-closed shift', async () => {
    mockSession('cashier', 'user-1');
    (Shift.findById as jest.Mock).mockResolvedValue({
      status: 'closed',
      openedBy: { toString: () => 'user-1' },
    });

    const request = new NextRequest('http://localhost/x', {
      method: 'POST',
      body: JSON.stringify({ actualCash: 1000 }),
    });
    const response = await closeShift(request, { params: Promise.resolve({ id: 'shift-1' }) });

    expect(response.status).toBe(400);
  });
});
