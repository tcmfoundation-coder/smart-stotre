import { getOrders } from '@/lib/actions/orders';
import { requireManagerOrAdmin } from '@/lib/security';
import Order from '@/models/Order';

jest.mock('@/lib/security', () => ({
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models/Order', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

describe('getOrders requires manager/admin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a cashier before querying', async () => {
    (requireManagerOrAdmin as jest.Mock).mockRejectedValue(new Error('Manager or admin access required'));

    await expect(getOrders()).rejects.toThrow('Manager or admin access required');
    expect(Order.find).not.toHaveBeenCalled();
  });

  it('succeeds for a manager', async () => {
    (requireManagerOrAdmin as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'manager' });
    (Order.find as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

    await expect(getOrders()).resolves.toEqual([]);
  });
});
