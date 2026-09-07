import { NextRequest } from 'next/server';
import { GET as getDashboardStats } from '@/app/api/dashboard/stats/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Sale from '@/models/Sale';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn(), countDocuments: jest.fn().mockResolvedValue(3) },
}));

jest.mock('@/models/Product', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn().mockResolvedValue(5) },
}));

jest.mock('@/models/Customer', () => ({
  __esModule: true,
  default: { countDocuments: jest.fn().mockResolvedValue(7) },
}));

jest.mock('@/models/Sale', () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn().mockResolvedValue([{ total: 1000, count: 4 }]),
    countDocuments: jest.fn().mockResolvedValue(4),
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 's1', saleNumber: 'SALE-1', total: 500 }]),
    }),
  },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes a cashier response to only their allowed dashboard cards', async () => {
    mockSession('cashier');

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await getDashboardStats(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    // Allowed for cashier (todaySales, numberOfTransactions, itemsSoldToday, currentShiftSales).
    expect(payload.data.todayRevenue).toBe(1000);
    expect(payload.data.todaySalesCount).toBe(4);
    expect(payload.data.itemsSoldToday).toBe(1000);

    // Not in a cashier's dashboardCards - must not leak store-wide figures.
    expect(payload.data.totalRevenue).toBeUndefined();
    expect(payload.data.weeklyRevenue).toBeUndefined();
    expect(payload.data.monthlyRevenue).toBeUndefined();
    expect(payload.data.revenueChange).toBeUndefined();
    expect(payload.data.totalProducts).toBeUndefined();
    expect(payload.data.lowStockProducts).toBeUndefined();
    expect(payload.data.outOfStockProducts).toBeUndefined();
    expect(payload.data.totalEmployees).toBeUndefined();
    expect(payload.data.totalCustomers).toBeUndefined();
    // showRecentTransactions is false for cashier - must be empty, and the
    // Sale.find for it should never even run.
    expect(payload.data.recentTransactions).toEqual([]);
    expect(Sale.find).not.toHaveBeenCalled();
  });

  it('returns the full data set for an admin, including recent transactions', async () => {
    mockSession('admin');

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await getDashboardStats(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.totalRevenue).toBe(1000);
    expect(payload.data.monthlyRevenue).toBe(1000);
    expect(payload.data.totalEmployees).toBe(3);
    expect(payload.data.totalCustomers).toBe(7);
    expect(payload.data.recentTransactions).toHaveLength(1);
    expect(Sale.find).toHaveBeenCalled();
    // No role's dashboardCards includes 'weeklySales' in rbac.ts today, so
    // this field is (correctly) never exposed to any role, admin included.
    expect(payload.data.weeklyRevenue).toBeUndefined();
  });

  it('counts only active staff for totalEmployees, not deactivated accounts', async () => {
    mockSession('admin');

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    await getDashboardStats(request);

    expect(User.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true })
    );
  });
});
