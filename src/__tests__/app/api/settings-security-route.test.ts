import { POST } from '@/app/api/settings/security/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import { resetRateLimit } from '@/lib/auth-rate-limit';

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

const session = {
  user: { id: 'user-1', email: 'cashier@example.com', role: 'cashier', branchId: 'branch-1' },
};

function mockAuthenticatedUser(comparePassword: jest.Mock, save: jest.Mock) {
  (auth as jest.Mock).mockResolvedValue(session);
  (User.findById as jest.Mock)
    // authenticateRequest()'s own re-verification query
    .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
    // the route handler's own lookup of the full document
    .mockReturnValueOnce(Promise.resolve({ comparePassword, save }));
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/settings/security', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/settings/security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimit('password-change:user-1');
  });

  it('rejects when currentPassword or newPassword is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (User.findById as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }),
    });

    const response = await POST(makeRequest({ currentPassword: 'old' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });

  it('rejects a new password shorter than 6 characters', async () => {
    (auth as jest.Mock).mockResolvedValue(session);
    (User.findById as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }),
    });

    const response = await POST(makeRequest({ currentPassword: 'old', newPassword: 'abc' }) as any);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });

  it('rejects when the current password does not match', async () => {
    const comparePassword = jest.fn().mockResolvedValue(false);
    const save = jest.fn();
    mockAuthenticatedUser(comparePassword, save);

    const response = await POST(
      makeRequest({ currentPassword: 'wrong', newPassword: 'newpassword123' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual(
      expect.objectContaining({ success: false, error: 'Current password is incorrect' })
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('updates the password when the current password matches', async () => {
    const comparePassword = jest.fn().mockResolvedValue(true);
    const save = jest.fn().mockResolvedValue(undefined);
    const userDoc: { comparePassword: jest.Mock; save: jest.Mock; password?: string } = {
      comparePassword,
      save,
    };
    (auth as jest.Mock).mockResolvedValue(session);
    (User.findById as jest.Mock)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ role: 'cashier', isActive: true }) })
      .mockReturnValueOnce(Promise.resolve(userDoc));

    const response = await POST(
      makeRequest({ currentPassword: 'correct', newPassword: 'newpassword123' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userDoc.password).toBe('newpassword123');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('rate-limits repeated attempts for the same user', async () => {
    const comparePassword = jest.fn().mockResolvedValue(false);
    const save = jest.fn();

    for (let i = 0; i < 5; i++) {
      mockAuthenticatedUser(comparePassword, save);
      await POST(makeRequest({ currentPassword: 'wrong', newPassword: 'newpassword123' }) as any);
    }

    mockAuthenticatedUser(comparePassword, save);
    const response = await POST(
      makeRequest({ currentPassword: 'wrong', newPassword: 'newpassword123' }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.success).toBe(false);
  });
});
