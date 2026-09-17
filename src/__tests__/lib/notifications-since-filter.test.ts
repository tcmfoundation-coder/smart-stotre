import { getNotifications } from '@/lib/actions/notifications';
import { getCurrentUser } from '@/lib/security';
import { Notification } from '@/models';

jest.mock('@/lib/security', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/models', () => ({
  Notification: { find: jest.fn() },
}));

function mockUser(role: string, id = 'user-1') {
  (getCurrentUser as jest.Mock).mockResolvedValue({ id, role, branchId: 'branch-1' });
}

function mockFind(result: unknown[] = []) {
  const sort = jest.fn().mockReturnThis();
  const limit = jest.fn().mockResolvedValue(result);
  (Notification.find as jest.Mock).mockReturnValue({ sort, limit });
}

// Regression coverage for the `since` filter added to support polling for
// "what's new" (the notification bell/toast/browser-notification delivery
// mechanism) without re-fetching or re-surfacing everything on every poll.
describe('getNotifications since filter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an unauthenticated caller before querying', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    await expect(getNotifications()).rejects.toThrow('Authentication required');
    expect(Notification.find).not.toHaveBeenCalled();
  });

  it('adds a createdAt $gt filter when since is a valid ISO timestamp', async () => {
    mockUser('admin');
    mockFind([]);
    const since = '2024-01-01T00:00:00.000Z';

    await getNotifications({ since });

    const query = (Notification.find as jest.Mock).mock.calls[0][0];
    expect(query.createdAt).toEqual({ $gt: new Date(since) });
  });

  it('ignores an invalid since value instead of crashing or filtering everything out', async () => {
    mockUser('admin');
    mockFind([]);

    await getNotifications({ since: 'not-a-real-date' });

    const query = (Notification.find as jest.Mock).mock.calls[0][0];
    expect(query.createdAt).toBeUndefined();
  });

  it('applies the since filter on top of the role-based visibility filter, not instead of it', async () => {
    mockUser('cashier', 'cashier-1');
    mockFind([]);
    const since = '2024-01-01T00:00:00.000Z';

    await getNotifications({ since });

    const query = (Notification.find as jest.Mock).mock.calls[0][0];
    expect(query.$or).toBeDefined();
    expect(query.createdAt).toEqual({ $gt: new Date(since) });
  });

  it('omits createdAt entirely when since is not provided', async () => {
    mockUser('admin');
    mockFind([]);

    await getNotifications();

    const query = (Notification.find as jest.Mock).mock.calls[0][0];
    expect(query.createdAt).toBeUndefined();
  });
});
