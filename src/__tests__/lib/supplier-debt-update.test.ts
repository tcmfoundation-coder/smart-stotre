import { updateSupplierDebt } from '@/lib/actions/suppliers';
import { requireManagerOrAdmin } from '@/lib/security';
import { Supplier } from '@/models';

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
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
  Supplier: { findOneAndUpdate: jest.fn(), findById: jest.fn() },
}));

describe('updateSupplierDebt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireManagerOrAdmin as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'admin' });
  });

  it('applies an atomic guarded increment for "add"', async () => {
    (Supplier.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 's1', outstandingDebt: 150 });

    await updateSupplierDebt('s1', 50, 'add');

    expect(Supplier.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 's1' },
      { $inc: { outstandingDebt: 50 } },
      { new: true }
    );
  });

  it('applies an atomic guarded decrement for "subtract", only matching if enough debt remains', async () => {
    (Supplier.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: 's1', outstandingDebt: 50 });

    await updateSupplierDebt('s1', 50, 'subtract');

    expect(Supplier.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 's1', outstandingDebt: { $gte: 50 } },
      { $inc: { outstandingDebt: -50 } },
      { new: true }
    );
  });

  it('rejects a subtract that would drive debt negative, via the atomic guard rather than a stale read', async () => {
    (Supplier.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (Supplier.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 's1' }) });

    await expect(updateSupplierDebt('s1', 500, 'subtract')).rejects.toThrow('Debt amount exceeds outstanding debt');
  });

  it('reports supplier not found distinctly from insufficient debt', async () => {
    (Supplier.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (Supplier.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(updateSupplierDebt('missing', 50, 'subtract')).rejects.toThrow('Supplier not found');
  });

  it.each([0, -10, NaN, Infinity])('rejects a non-positive or non-finite amount (%s) before touching the database', async (amount) => {
    await expect(updateSupplierDebt('s1', amount, 'add')).rejects.toThrow(/positive number/);
    expect(Supplier.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
