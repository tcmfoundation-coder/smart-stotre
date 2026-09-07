import { NextRequest } from 'next/server';
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
  UserActivity: { getActiveUsers: jest.fn(), countDocuments: jest.fn().mockResolvedValue(0) },
}));

// This route previously trusted session.user.role (the JWT claim) directly
// instead of re-verifying against the database - the same "stale privilege
// window" bug already fixed elsewhere for withAuth/withRole. A demoted-but-
// still-logged-in admin could keep using it until their token expired.
// (api/register/route.ts had the identical issue and its own test here, but
// that route was removed outright - see "public registration" in
// SMART_STORE_AUDIT.md - rather than kept patched as a second, redundant
// user-creation endpoint alongside api/users.)
describe('stale-privilege fix: admin routes re-verify role against the DB', () => {
  beforeEach(() => jest.clearAllMocks());

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
    (UserActivity.countDocuments as jest.Mock).mockResolvedValue(4);

    const request = new NextRequest('http://localhost/api/user-activity/active');
    const response = await activeUsersGET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    // Sessions-today is a separate count (documents whose session started
    // today) from active-now, not a duplicate of the active-users list.
    expect(payload.sessionsToday).toBe(4);
  });
});
