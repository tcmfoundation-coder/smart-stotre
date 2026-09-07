import { getCustomers, deleteCustomer } from '@/lib/actions/customers';
import { requireAuth, requireManagerOrAdmin } from '@/lib/security';
import { Customer } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/models', () => ({
  Customer: { find: jest.fn(), findByIdAndUpdate: jest.fn(), findByIdAndDelete: jest.fn() },
}));

describe('customer soft delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'cashier' });
    (requireManagerOrAdmin as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'manager' });
  });

  it('deleteCustomer soft-deletes (isActive: false) rather than hard-deleting', async () => {
    (Customer.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    await deleteCustomer('c1');

    expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('c1', { isActive: false });
    expect(Customer.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('getCustomers matches isActive:true OR the field being entirely absent, so pre-existing customers are not hidden', async () => {
    (Customer.find as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

    await getCustomers();

    const query = (Customer.find as jest.Mock).mock.calls[0][0];
    expect(query.isActive).toEqual({ $ne: false });
  });
});
