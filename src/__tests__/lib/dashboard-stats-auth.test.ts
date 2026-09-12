import { getDashboardStats, getSalesData } from '@/lib/actions/dashboard';
import { requireAuth } from '@/lib/security';
import { Sale } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  Sale: { find: jest.fn() },
  Product: { countDocuments: jest.fn() },
  Expense: { find: jest.fn() },
  Customer: { countDocuments: jest.fn() },
  Notification: { countDocuments: jest.fn() },
}));

describe('dashboard actions require authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockRejectedValue(new Error('Authentication required'));
  });

  it('getDashboardStats rejects an unauthenticated caller before querying revenue/profit data', async () => {
    await expect(getDashboardStats()).rejects.toThrow('Authentication required');
    expect(Sale.find).not.toHaveBeenCalled();
  });

  it('getSalesData rejects an unauthenticated caller before querying', async () => {
    await expect(getSalesData('monthly')).rejects.toThrow('Authentication required');
    expect(Sale.find).not.toHaveBeenCalled();
  });
});
