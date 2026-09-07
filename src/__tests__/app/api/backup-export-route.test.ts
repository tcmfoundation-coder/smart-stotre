import { NextRequest } from 'next/server';
import { GET as exportBackup } from '@/app/api/backup/export/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { logActivity } from '@/lib/activity-log';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/activity-log', () => ({
  logActivity: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

const MODEL_NAMES = [
  'User', 'Category', 'Product', 'Customer', 'Supplier', 'Sale', 'Expense', 'Employee', 'Branch',
  'Notification', 'AIReport', 'Order', 'Transaction', 'Loyalty', 'WhatsAppMessage', 'UserActivity',
  'StockAdjustment', 'PurchaseOrder', 'Report', 'Role', 'Promotion', 'ActivityLog', 'Return', 'Shift',
];

jest.mock('@/models', () => {
  const models: Record<string, { find: jest.Mock }> = {};
  for (const name of [
    'User', 'Category', 'Product', 'Customer', 'Supplier', 'Sale', 'Expense', 'Employee', 'Branch',
    'Notification', 'AIReport', 'Order', 'Transaction', 'Loyalty', 'WhatsAppMessage', 'UserActivity',
    'StockAdjustment', 'PurchaseOrder', 'Report', 'Role', 'Promotion', 'ActivityLog', 'Return', 'Shift',
  ]) {
    models[name] = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) };
  }
  return models;
});

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@example.com', role, name: 'Admin User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe('GET /api/backup/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('streams a JSON export with every registered collection for an admin', async () => {
    mockSession('admin');
    const { Product, Sale } = jest.requireMock('@/models') as Record<string, { find: jest.Mock }>;
    Product.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 'p1', name: 'Widget' }]) });
    Sale.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 's1', total: 100 }]) });

    const request = new NextRequest('http://localhost/api/backup/export');
    const response = await exportBackup(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toMatch(/attachment; filename="smart-store-backup-.*\.json"/);

    const body = await readStreamToString(response.body as ReadableStream<Uint8Array>);
    const parsed = JSON.parse(body);

    expect(parsed.generatedAt).toBeDefined();
    expect(parsed.collections.products).toEqual([{ _id: 'p1', name: 'Widget' }]);
    expect(parsed.collections.sales).toEqual([{ _id: 's1', total: 100 }]);
    // Every registered model must appear, even ones with no documents yet.
    expect(Object.keys(parsed.collections)).toHaveLength(MODEL_NAMES.length);
  });

  it('logs the export as a sensitive activity', async () => {
    mockSession('admin');

    const request = new NextRequest('http://localhost/api/backup/export');
    const response = await exportBackup(request);
    await readStreamToString(response.body as ReadableStream<Uint8Array>);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATABASE_EXPORTED', severity: 'warning', userId: 'admin-1' })
    );
  });

  it('rejects a manager (only backup_restore-holding admins may export)', async () => {
    mockSession('manager');

    const request = new NextRequest('http://localhost/api/backup/export');
    const response = await exportBackup(request);

    expect(response.status).toBe(403);
  });

  it('rejects a cashier', async () => {
    mockSession('cashier');

    const request = new NextRequest('http://localhost/api/backup/export');
    const response = await exportBackup(request);

    expect(response.status).toBe(403);
  });
});
