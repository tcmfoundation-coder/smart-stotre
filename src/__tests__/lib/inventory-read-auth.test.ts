import { getProducts, getProductById, getCategories, getLowStockProducts, getExpiringProducts } from '@/lib/actions/inventory';
import { requireAuth } from '@/lib/security';
import { Product, Category } from '@/models';

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
}));

describe('inventory read actions require authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuth as jest.Mock).mockRejectedValue(new Error('Authentication required'));
  });

  it('getProducts rejects an unauthenticated caller before querying', async () => {
    await expect(getProducts()).rejects.toThrow('Authentication required');
    expect(Product.find).not.toHaveBeenCalled();
  });

  it('getProductById rejects an unauthenticated caller before querying', async () => {
    await expect(getProductById('p1')).rejects.toThrow('Authentication required');
    expect(Product.findById).not.toHaveBeenCalled();
  });

  it('getCategories rejects an unauthenticated caller before querying', async () => {
    await expect(getCategories()).rejects.toThrow('Authentication required');
    expect(Category.find).not.toHaveBeenCalled();
  });

  it('getLowStockProducts rejects an unauthenticated caller before querying', async () => {
    await expect(getLowStockProducts()).rejects.toThrow('Authentication required');
    expect(Product.find).not.toHaveBeenCalled();
  });

  it('getExpiringProducts rejects an unauthenticated caller before querying', async () => {
    await expect(getExpiringProducts()).rejects.toThrow('Authentication required');
    expect(Product.find).not.toHaveBeenCalled();
  });

  it('getProducts succeeds once authenticated', async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ id: 'user-1', role: 'cashier' });
    (Product.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([{ _id: 'p1', name: 'Widget' }]),
    });

    const result = await getProducts();
    expect(result).toHaveLength(1);
  });
});
