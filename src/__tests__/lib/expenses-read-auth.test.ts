import { getExpenses, getExpenseById, getExpenseSummary } from '@/lib/actions/expenses';
import { requireManagerOrAdmin } from '@/lib/security';
import { Expense } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAdmin: jest.fn(),
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  Expense: { find: jest.fn(), findById: jest.fn() },
}));

describe('expenses read actions require manager/admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireManagerOrAdmin as jest.Mock).mockRejectedValue(new Error('Manager or admin access required'));
  });

  it('getExpenses rejects a cashier before querying', async () => {
    await expect(getExpenses()).rejects.toThrow('Manager or admin access required');
    expect(Expense.find).not.toHaveBeenCalled();
  });

  it('getExpenseById rejects a cashier before querying', async () => {
    await expect(getExpenseById('e1')).rejects.toThrow('Manager or admin access required');
    expect(Expense.findById).not.toHaveBeenCalled();
  });

  it('getExpenseSummary rejects a cashier before querying', async () => {
    await expect(getExpenseSummary(new Date(), new Date())).rejects.toThrow('Manager or admin access required');
    expect(Expense.find).not.toHaveBeenCalled();
  });
});
