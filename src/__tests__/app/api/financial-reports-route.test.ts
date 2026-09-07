import { NextRequest } from 'next/server';
import { GET } from '@/app/api/financial-reports/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { Sale, Expense } from '@/models';

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
  Sale: { find: jest.fn(), aggregate: jest.fn() },
  Expense: { find: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function mockEmptyData() {
  (Sale.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
  (Expense.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
  (Sale.aggregate as jest.Mock).mockResolvedValue([]);
}

describe('GET /api/financial-reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects roles without view_financial_reports', async () => {
    mockSession('cashier');
    mockEmptyData();

    const request = new NextRequest('http://localhost/api/financial-reports?dateRange=month');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it('computes real revenue, cost-based profit, and expenses for an admin', async () => {
    mockSession('admin');

    (Sale.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          total: 1000,
          items: [{ buyingPrice: 200, quantity: 2 }], // cost = 400
        },
      ]),
    });
    (Expense.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ category: 'rent', amount: 100 }]),
    });
    (Sale.aggregate as jest.Mock).mockResolvedValue([
      { _id: 'cat-1', amount: 1000, category: { name: 'Beverages' } },
    ]);

    const request = new NextRequest('http://localhost/api/financial-reports?dateRange=month');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    // revenue 1000, cost 400, grossProfit 600, expenses 100, netProfit 500
    expect(payload.data.metrics.totalRevenue).toBe(1000);
    expect(payload.data.metrics.netProfit).toBe(500);
    expect(payload.data.metrics.totalExpenses).toBe(100);
    expect(payload.data.metrics.profitMargin).toBeCloseTo(50, 5);
    expect(payload.data.expenseBreakdown).toEqual([
      expect.objectContaining({ category: 'rent', amount: 100, percentage: 100 }),
    ]);
    expect(payload.data.revenueByCategory).toEqual([
      expect.objectContaining({ category: 'Beverages', amount: 1000, percentage: 100 }),
    ]);
  });

  it('returns zeroed metrics with no data instead of throwing', async () => {
    mockSession('admin');
    mockEmptyData();

    const request = new NextRequest('http://localhost/api/financial-reports?dateRange=today');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.metrics.totalRevenue).toBe(0);
    expect(payload.data.metrics.profitMargin).toBe(0);
    expect(payload.data.expenseBreakdown).toEqual([]);
    expect(payload.data.revenueByCategory).toEqual([]);
  });

  it('accepts an explicit startDate/endDate custom range', async () => {
    mockSession('admin');
    mockEmptyData();

    const request = new NextRequest(
      'http://localhost/api/financial-reports?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });
});
