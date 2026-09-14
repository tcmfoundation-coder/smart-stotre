import { NextRequest } from 'next/server';
import { GET as getReport } from '@/app/api/reports/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { Report } from '@/models';

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
  Report: { findById: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

function makeRequest(id: string) {
  return {
    request: new NextRequest(`http://localhost/api/reports/${id}`),
    context: { params: Promise.resolve({ id }) },
  };
}

describe('GET /api/reports/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when the report does not exist', async () => {
    mockSession('admin');
    (Report.findById as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    const { request, context } = makeRequest('missing-id');
    const response = await getReport(request, context);

    expect(response.status).toBe(404);
  });

  it('rejects a cashier opening a financial report by id (no view_financial_reports permission)', async () => {
    mockSession('cashier');
    (Report.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: { toString: () => 'report-1' },
        type: 'financial',
        name: 'Financial Report',
      }),
    });

    const { request, context } = makeRequest('report-1');
    const response = await getReport(request, context);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it('rejects a manager opening a financial report by id (not in their permission set)', async () => {
    mockSession('manager');
    (Report.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: { toString: () => 'report-1' },
        type: 'financial',
        name: 'Financial Report',
      }),
    });

    const { request, context } = makeRequest('report-1');
    const response = await getReport(request, context);

    expect(response.status).toBe(403);
  });

  it('allows a manager to open a sales report by id (permission they hold)', async () => {
    mockSession('manager');
    (Report.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: { toString: () => 'report-1' },
        type: 'sales',
        name: 'Sales Report',
        status: 'completed',
        generatedBy: 'Manager Mo',
        generatedAt: new Date('2024-01-15'),
        metadata: { totalRevenue: 5000, totalTransactions: 10 },
      }),
    });

    const { request, context } = makeRequest('report-1');
    const response = await getReport(request, context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data._id).toBe('report-1');
    expect(payload.data.metadata.totalRevenue).toBe(5000);
  });

  it('allows an admin to open any report type by id', async () => {
    mockSession('admin');
    (Report.findById as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: { toString: () => 'report-2' },
        type: 'financial',
        name: 'Financial Report',
        status: 'completed',
        generatedBy: 'Admin Amy',
        generatedAt: new Date('2024-01-15'),
        metadata: { revenue: 1000, expenses: 400, profit: 600, profitMargin: 60 },
      }),
    });

    const { request, context } = makeRequest('report-2');
    const response = await getReport(request, context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.metadata.profit).toBe(600);
  });
});
