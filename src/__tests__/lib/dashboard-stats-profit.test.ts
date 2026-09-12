import { getDashboardStats } from '@/lib/actions/dashboard';
import { requireAuth } from '@/lib/security';
import { Sale, Expense } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  Sale: { find: jest.fn() },
  Product: { countDocuments: jest.fn().mockResolvedValue(0) },
  Expense: { find: jest.fn() },
  Customer: { countDocuments: jest.fn().mockResolvedValue(0) },
  Notification: { countDocuments: jest.fn().mockResolvedValue(0) },
}));

describe('getDashboardStats profit calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'admin' });
  });

  it('subtracts cost of goods sold, not just expenses, matching the Financial Reports definition of profit', async () => {
    const sale = {
      total: 1000,
      items: [{ buyingPrice: 300, quantity: 2 }], // COGS = 600
    };
    // Every Sale.find() call in this function (today/month/lastMonth/recent)
    // resolves to the same population for simplicity - the assertion only
    // depends on the monthly one.
    (Sale.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve([sale]).then(resolve),
    });
    (Expense.find as jest.Mock).mockResolvedValue([{ amount: 100 }]);

    const stats = await getDashboardStats();

    // revenue 1000 - COGS 600 - expenses 100 = 300, NOT 1000 - 100 = 900.
    expect(stats.totalProfit).toBe(300);
  });
});
