import { NextRequest } from 'next/server';
import { POST as generateReport } from '@/app/api/reports/generate/route';
import { GET as listReports, DELETE as deleteReport } from '@/app/api/reports/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { Report, Sale, Product, Customer, Expense } from '@/models';

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

jest.mock('@/models', () => ({
  Report: { create: jest.fn(), find: jest.fn(), countDocuments: jest.fn(), findById: jest.fn(), findByIdAndDelete: jest.fn() },
  Sale: { find: jest.fn() },
  Product: { find: jest.fn() },
  Customer: { find: jest.fn() },
  Expense: { find: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function leanFind(model: { find: jest.Mock }, result: unknown[]) {
  model.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(result) });
}

describe('POST /api/reports/generate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a cashier generating a financial report', async () => {
    mockSession('cashier');

    const request = new NextRequest('http://localhost/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'financial', dateRange: 'month' }),
    });
    const response = await generateReport(request);

    expect(response.status).toBe(403);
    expect(Report.create).not.toHaveBeenCalled();
  });

  it('allows a manager to generate a sales report (permission they hold)', async () => {
    mockSession('manager');
    leanFind(Sale as unknown as { find: jest.Mock }, [{ total: 100 }, { total: 50 }]);
    (Report.create as jest.Mock).mockResolvedValue({
      toObject: () => ({ type: 'sales', name: 'Sales Report' }),
      _id: { toString: () => 'report-1' },
      generatedAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'sales', dateRange: 'month' }),
    });
    const response = await generateReport(request);

    expect(response.status).toBe(200);
    expect(Report.create).toHaveBeenCalled();
  });

  it('rejects a manager generating a financial report (not in their permission set)', async () => {
    mockSession('manager');

    const request = new NextRequest('http://localhost/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'financial', dateRange: 'month' }),
    });
    const response = await generateReport(request);

    expect(response.status).toBe(403);
    expect(Report.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes an unfiltered list to only the types the role may view', async () => {
    mockSession('cashier');
    (Report.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    (Report.countDocuments as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost/api/reports');
    const response = await listReports(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    // Cashier holds none of the four view_*_reports permissions in rbac.ts.
    expect(payload.data).toEqual([]);
    expect(Report.find).not.toHaveBeenCalled();
  });

  it('rejects an explicit request for a type the role cannot view', async () => {
    mockSession('cashier');

    const request = new NextRequest('http://localhost/api/reports?type=financial');
    const response = await listReports(request);

    expect(response.status).toBe(403);
    expect(Report.find).not.toHaveBeenCalled();
  });

  it('allows a manager to list sales reports', async () => {
    mockSession('manager');
    (Report.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: { toString: () => 'r1' }, type: 'sales' }]),
    });
    (Report.countDocuments as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost/api/reports?type=sales');
    const response = await listReports(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
  });
});

describe('DELETE /api/reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a cashier deleting a financial report', async () => {
    mockSession('cashier');
    (Report.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ type: 'financial' }),
    });

    const request = new NextRequest('http://localhost/api/reports?id=report-1', { method: 'DELETE' });
    const response = await deleteReport(request);

    expect(response.status).toBe(403);
    expect(Report.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('allows a manager to delete a sales report', async () => {
    mockSession('manager');
    (Report.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ type: 'sales' }),
    });
    (Report.findByIdAndDelete as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/reports?id=report-1', { method: 'DELETE' });
    const response = await deleteReport(request);

    expect(response.status).toBe(200);
    expect(Report.findByIdAndDelete).toHaveBeenCalledWith('report-1');
  });

  it('returns 404 for a non-existent report rather than leaking a permission error', async () => {
    mockSession('admin');
    (Report.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });

    const request = new NextRequest('http://localhost/api/reports?id=missing', { method: 'DELETE' });
    const response = await deleteReport(request);

    expect(response.status).toBe(404);
  });
});
