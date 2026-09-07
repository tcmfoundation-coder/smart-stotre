import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/activity-logs/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';

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

jest.mock('@/models/ActivityLog', () => ({
  __esModule: true,
  default: { find: jest.fn(), create: jest.fn() },
}));

function mockSession(role: string) {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'user-1', email: 'user@example.com', role, name: 'Test User' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role, isActive: true }),
  });
}

describe('GET /api/activity-logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-admin roles', async () => {
    mockSession('cashier');

    const request = new NextRequest('http://localhost/api/activity-logs');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it('returns real logs for an admin, mapped to the frontend shape', async () => {
    mockSession('admin');
    const now = new Date();
    (ActivityLog.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'log-1' },
          action: 'USER_LOGIN',
          description: 'Test User logged in',
          userId: { toString: () => 'user-1' },
          userName: 'Test User',
          userRole: 'admin',
          ipAddress: '127.0.0.1',
          severity: 'info',
          createdAt: now,
        },
      ]),
    });

    const request = new NextRequest('http://localhost/api/activity-logs');
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: 'log-1',
        action: 'USER_LOGIN',
        userName: 'Test User',
        severity: 'info',
      }),
    ]);
  });
});

describe('POST /api/activity-logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-admin roles', async () => {
    mockSession('manager');

    const request = new NextRequest('http://localhost/api/activity-logs', {
      method: 'POST',
      body: JSON.stringify({ action: 'TEST', description: 'test' }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
  });

  it('rejects a request missing action or description', async () => {
    mockSession('admin');

    const request = new NextRequest('http://localhost/api/activity-logs', {
      method: 'POST',
      body: JSON.stringify({ action: 'TEST' }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });

  it('persists a real record for a valid admin request', async () => {
    mockSession('admin');
    const now = new Date();
    (ActivityLog.create as jest.Mock).mockResolvedValue({
      _id: { toString: () => 'log-2' },
      action: 'TEST_EVENT',
      description: 'did a thing',
      userId: { toString: () => 'user-1' },
      userName: 'Test User',
      userRole: 'admin',
      ipAddress: 'unknown',
      severity: 'info',
      createdAt: now,
    });

    const request = new NextRequest('http://localhost/api/activity-logs', {
      method: 'POST',
      body: JSON.stringify({ action: 'TEST_EVENT', description: 'did a thing' }),
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEST_EVENT',
        description: 'did a thing',
        userId: 'user-1',
        userName: 'Test User',
        userRole: 'admin',
      })
    );
  });
});
