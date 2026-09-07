import { NextRequest } from 'next/server';
import { POST as registerPOST } from '@/app/api/register/route';
import { GET as activeUsersGET } from '@/app/api/user-activity/active/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { UserActivity } from '@/models';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn(), findOne: jest.fn() },
}));

jest.mock('@/models', () => ({
  Role: { findOne: jest.fn() },
  UserActivity: { getActiveUsers: jest.fn() },
}));

// These two routes previously trusted session.user.role (the JWT claim) directly
// instead of re-verifying against the database - the same "stale privilege
// window" bug already fixed elsewhere for withAuth/withRole. A demoted-but-
// still-logged-in admin could keep using them until their token expired.
describe('stale-privilege fix: admin routes re-verify role against the DB', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST /api/register rejects a stale admin JWT claim once the DB says otherwise', async () => {
    // Session JWT still claims admin...
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'demoted@example.com', role: 'admin' },
    });
    // ...but the database (re-checked on every request) says they were demoted.
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }),
    });

    const request = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'x', email: 'x@example.com', password: 'password123', role: 'cashier' }),
    });
    const response = await registerPOST(request);

    expect(response.status).toBe(403);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('GET /api/user-activity/active rejects a stale admin JWT claim once the DB says otherwise', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'demoted@example.com', role: 'admin' },
    });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'manager', isActive: true }),
    });

    const request = new NextRequest('http://localhost/api/user-activity/active');
    const response = await activeUsersGET(request);

    expect(response.status).toBe(403);
    expect(UserActivity.getActiveUsers).not.toHaveBeenCalled();
  });

  it('GET /api/user-activity/active allows a real, DB-verified admin', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'admin@example.com', role: 'admin' },
    });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue({ role: 'admin', isActive: true }),
    });
    (UserActivity.getActiveUsers as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/user-activity/active');
    const response = await activeUsersGET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
  });
});
