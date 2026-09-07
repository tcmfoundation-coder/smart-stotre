import { NextRequest } from 'next/server';
import { POST } from '@/app/api/purchase-orders/[id]/approve/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { PurchaseOrder } from '@/models';

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
  PurchaseOrder: { findById: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function makeRequest() {
  return new NextRequest('http://localhost/api/purchase-orders/po-1/approve', {
    method: 'POST',
  });
}

describe('POST /api/purchase-orders/[id]/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a cashier (no approve_purchase_orders permission)', async () => {
    mockSession('cashier');

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it('returns 404 when the order does not exist', async () => {
    mockSession('manager');
    (PurchaseOrder.findById as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
  });

  it('rejects approving an order that is not pending', async () => {
    mockSession('manager');
    (PurchaseOrder.findById as jest.Mock).mockResolvedValue({
      status: 'approved',
      save: jest.fn(),
    });

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });

  it('approves a pending order for a manager', async () => {
    mockSession('manager');
    const order = {
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({ status: 'approved' }),
      _id: { toString: () => 'po-1' },
    };
    (PurchaseOrder.findById as jest.Mock).mockResolvedValue(order);

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(order.status).toBe('approved');
    expect(order.save).toHaveBeenCalledTimes(1);
  });
});
