import { getProductById, getCategories } from '@/lib/actions/inventory';
import { getSuppliers } from '@/lib/actions/suppliers';
import { requireAuth, requireManagerOrAdmin } from '@/lib/security';
import { Product, Category, Supplier } from '@/models';

// Regression test for a bug where the product detail page
// (src/app/dashboard/inventory/[id]/page.tsx) fetched getProductById,
// getCategories, and getSuppliers with Promise.all and let any one
// rejection fail the whole load. getSuppliers requires manager/admin
// while getProductById and getCategories only require basic
// authentication, so a cashier - who has permission to view products at
// all - had the product data thrown away by the all-or-nothing
// Promise.all whenever getSuppliers rejected with a permission error.
//
// This locks in the permission contract that must hold for the page's
// "let categories/suppliers fail independently of the product itself"
// fix to make sense: viewing a product must never require a stricter
// permission than viewing the supplier list.

jest.mock('@/lib/security', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
  requireManagerOrAdmin: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  Product: { find: jest.fn(), findById: jest.fn() },
  Category: { find: jest.fn() },
  Supplier: { find: jest.fn() },
}));

const cashier = { id: 'user-1', role: 'cashier' };

describe('product detail page data sources - permission contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getProductById succeeds for a cashier (view-only permission)', async () => {
    (requireAuth as jest.Mock).mockResolvedValue(cashier);
    (Product.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
    });

    await expect(getProductById('p1')).resolves.not.toThrow();
    expect(requireAuth).toHaveBeenCalled();
  });

  it('getCategories succeeds for a cashier (view-only permission)', async () => {
    (requireAuth as jest.Mock).mockResolvedValue(cashier);
    (Category.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    await expect(getCategories()).resolves.toEqual([]);
  });

  it('getSuppliers rejects a cashier - confirms the permission gap the page must tolerate', async () => {
    (requireManagerOrAdmin as jest.Mock).mockRejectedValue(
      new Error('Manager or admin access required')
    );

    await expect(getSuppliers()).rejects.toThrow('Manager or admin access required');
    expect(Supplier.find).not.toHaveBeenCalled();
  });
});
