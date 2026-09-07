import { getCustomers, getCustomerById, getTopCustomers, getCustomerPurchaseHistory } from '@/lib/actions/customers';
import { requireAuth } from '@/lib/security';
import { Customer } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  Customer: { find: jest.fn(), findById: jest.fn() },
  Loyalty: {},
  Sale: { find: jest.fn() },
}));

describe('customers read actions require authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockRejectedValue(new Error('Authentication required'));
  });

  it('getCustomers rejects an unauthenticated caller before querying', async () => {
    await expect(getCustomers()).rejects.toThrow('Authentication required');
    expect(Customer.find).not.toHaveBeenCalled();
  });

  it('getCustomerById rejects an unauthenticated caller before querying', async () => {
    await expect(getCustomerById('c1')).rejects.toThrow('Authentication required');
    expect(Customer.findById).not.toHaveBeenCalled();
  });

  it('getTopCustomers rejects an unauthenticated caller before querying', async () => {
    await expect(getTopCustomers()).rejects.toThrow('Authentication required');
    expect(Customer.find).not.toHaveBeenCalled();
  });

  it('getCustomerPurchaseHistory rejects an unauthenticated caller before querying', async () => {
    await expect(getCustomerPurchaseHistory('c1')).rejects.toThrow('Authentication required');
  });
});
