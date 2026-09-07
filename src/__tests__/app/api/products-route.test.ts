import { NextRequest } from 'next/server';
import { GET } from '@/app/api/products/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Product from '@/models/Product';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

jest.mock('@/models/Product', () => ({
  __esModule: true,
  default: { find: jest.fn(), countDocuments: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function mockFindChain() {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  };
  (Product.find as jest.Mock).mockReturnValue(chain);
  (Product.countDocuments as jest.Mock).mockResolvedValue(0);
  return chain;
}

describe('GET /api/products', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ignores a non-ObjectId category value instead of passing it straight to Mongoose', async () => {
    mockSession('cashier');
    mockFindChain();

    const request = new NextRequest('http://localhost/api/products?category=beverages');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    const query = (Product.find as jest.Mock).mock.calls[0][0];
    expect(query.categoryId).toBeUndefined();
  });

  it('applies a real ObjectId category filter', async () => {
    mockSession('cashier');
    mockFindChain();
    const validId = '507f1f77bcf86cd799439011';

    const request = new NextRequest(`http://localhost/api/products?category=${validId}`);
    await GET(request);

    const query = (Product.find as jest.Mock).mock.calls[0][0];
    expect(query.categoryId).toBe(validId);
  });

  it('builds a real query for outOfStock', async () => {
    mockSession('cashier');
    mockFindChain();

    const request = new NextRequest('http://localhost/api/products?outOfStock=true');
    await GET(request);

    const query = (Product.find as jest.Mock).mock.calls[0][0];
    expect(query.stockQuantity).toEqual({ $lte: 0 });
  });

  it('builds a real query for lowStock using minStockLevel', async () => {
    mockSession('cashier');
    mockFindChain();

    const request = new NextRequest('http://localhost/api/products?lowStock=true');
    await GET(request);

    const query = (Product.find as jest.Mock).mock.calls[0][0];
    expect(query.$expr).toEqual({ $lte: ['$stockQuantity', '$minStockLevel'] });
    expect(query.stockQuantity).toEqual({ $gt: 0 });
  });
});
