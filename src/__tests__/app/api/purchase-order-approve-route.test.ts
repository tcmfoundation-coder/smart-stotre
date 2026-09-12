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
  PurchaseOrder: { findById: jest.fn(), findOneAndUpdate: jest.fn() },
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
    (PurchaseOrder.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (PurchaseOrder.findById as jest.Mock).mockResolvedValue(null);

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.success).toBe(false);
  });

  it('rejects approving an order that is not pending', async () => {
    mockSession('manager');
    // The compare-and-swap doesn't match a non-pending order.
    (PurchaseOrder.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (PurchaseOrder.findById as jest.Mock).mockResolvedValue({ status: 'approved' });

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });

  it('approves a pending order for a manager', async () => {
    mockSession('manager');
    const order = {
      status: 'approved',
      toObject: jest.fn().mockReturnValue({ status: 'approved' }),
      _id: { toString: () => 'po-1' },
    };
    (PurchaseOrder.findOneAndUpdate as jest.Mock).mockResolvedValue(order);

    const response = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(order.status).toBe('approved');
    expect(PurchaseOrder.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'po-1', status: 'pending' },
      { status: 'approved' },
      { new: true }
    );
  });

  it('never double-approves when a second concurrent call arrives after the first already succeeded', async () => {
    mockSession('manager');
    // First call: the compare-and-swap matches and flips status.
    (PurchaseOrder.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
      status: 'approved',
      toObject: () => ({ status: 'approved' }),
      _id: { toString: () => 'po-1' },
    });
    const first = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    expect(first.status).toBe(200);

    // Second, concurrent/retried call: the compare-and-swap no longer matches.
    (PurchaseOrder.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(null);
    (PurchaseOrder.findById as jest.Mock).mockResolvedValue({ status: 'approved' });
    const second = await POST(makeRequest(), { params: Promise.resolve({ id: 'po-1' }) });
    const secondPayload = await second.json();

    expect(second.status).toBe(400);
    expect(secondPayload.success).toBe(false);
  });
});
