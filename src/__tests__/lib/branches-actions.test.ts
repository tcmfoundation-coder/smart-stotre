import { getBranches, getBranchById } from '@/lib/actions/branches';
import { requireAdmin } from '@/lib/security';
import Branch from '@/models/Branch';

jest.mock('@/lib/security', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models/Branch', () => ({
  __esModule: true,
  default: { find: jest.fn(), findById: jest.fn() },
}));

describe('branches actions - Paystack secret protection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getBranches rejects an unauthenticated/non-admin caller before querying', async () => {
    (requireAdmin as jest.Mock).mockRejectedValue(new Error('Admin access required'));

    await expect(getBranches()).rejects.toThrow('Admin access required');
    expect(Branch.find).not.toHaveBeenCalled();
  });

  it('getBranches excludes settings.paystackSecretKey from the query even for an admin', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    const selectMock = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ _id: 'b1', name: 'Main Branch' }]),
    });
    (Branch.find as jest.Mock).mockReturnValue({ select: selectMock });

    await getBranches();

    expect(selectMock).toHaveBeenCalledWith('-settings.paystackSecretKey');
  });

  it('getBranchById rejects a non-admin caller', async () => {
    (requireAdmin as jest.Mock).mockRejectedValue(new Error('Admin access required'));

    await expect(getBranchById('b1')).rejects.toThrow('Admin access required');
    expect(Branch.findById).not.toHaveBeenCalled();
  });

  it('getBranchById excludes settings.paystackSecretKey from the query', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ id: 'admin-1', role: 'admin' });
    const selectMock = jest.fn().mockResolvedValue({ _id: 'b1', name: 'Main Branch' });
    (Branch.findById as jest.Mock).mockReturnValue({ select: selectMock });

    await getBranchById('b1');

    expect(selectMock).toHaveBeenCalledWith('-settings.paystackSecretKey');
  });
});
