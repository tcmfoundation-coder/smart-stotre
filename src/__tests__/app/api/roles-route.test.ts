import { NextRequest } from 'next/server';
import { POST as createRole } from '@/app/api/roles/route';
import { PUT as updateRole } from '@/app/api/roles/[id]/route';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import Role from '@/models/Role';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn(), updateMany: jest.fn() },
}));

jest.mock('@/models/Role', () => ({
  __esModule: true,
  default: { findOne: jest.fn(), findById: jest.fn(), create: jest.fn() },
}));

jest.mock('@/lib/activity-log', () => ({
  logActivity: jest.fn(),
}));

function mockAdminSession() {
  (auth as jest.Mock).mockResolvedValue({
    user: { id: 'admin-1', email: 'admin@example.com', role: 'admin', name: 'Admin Amy' },
  });
  (User.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockResolvedValue({ role: 'admin', isActive: true }),
  });
}

function makeCreateRequest(body: unknown) {
  return new NextRequest('http://localhost/api/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeUpdateRequest(body: unknown) {
  return new NextRequest('http://localhost/api/roles/role-1', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

describe('POST /api/roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminSession();
  });

  it.each(['admin', 'manager', 'cashier', 'Admin', 'CASHIER'])(
    'rejects creating a custom role named "%s" (a reserved system role name)',
    async (name) => {
      const response = await createRole(makeCreateRequest({ name, description: 'Something' }));
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toMatch(/reserved/i);
      expect(Role.create).not.toHaveBeenCalled();
    }
  );

  it('allows creating a custom role with a non-reserved name', async () => {
    (Role.findOne as jest.Mock).mockResolvedValue(null);
    (Role.create as jest.Mock).mockResolvedValue({
      name: 'supervisor',
      description: 'Floor supervisor',
      permissions: [],
      isSystem: false,
    });

    const response = await createRole(makeCreateRequest({ name: 'Supervisor', description: 'Floor supervisor' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(Role.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'supervisor' }));
  });
});

describe('PUT /api/roles/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminSession();
  });

  it('rejects renaming a custom role to a reserved system role name (would silently mass-reassign real users on rename)', async () => {
    (Role.findById as jest.Mock).mockResolvedValue({
      _id: 'role-1',
      name: 'supervisor',
      isSystem: false,
      save: jest.fn(),
    });

    const response = await updateRole(makeUpdateRequest({ name: 'admin' }), { params: Promise.resolve({ id: 'role-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/reserved/i);
    expect(User.updateMany).not.toHaveBeenCalled();
  });

  it('rejects renaming away from a role that is itself a reserved name, even if somehow not marked isSystem', async () => {
    (Role.findById as jest.Mock).mockResolvedValue({
      _id: 'role-1',
      name: 'cashier',
      isSystem: false,
      save: jest.fn(),
    });

    const response = await updateRole(makeUpdateRequest({ name: 'trainee' }), { params: Promise.resolve({ id: 'role-1' }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/reserved/i);
    expect(User.updateMany).not.toHaveBeenCalled();
  });

  it('cascades a normal rename to matching users with runValidators enabled', async () => {
    const role = {
      _id: 'role-1',
      name: 'supervisor',
      isSystem: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Role.findById as jest.Mock).mockResolvedValue(role);
    (Role.findOne as jest.Mock).mockResolvedValue(null);
    (User.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

    const response = await updateRole(makeUpdateRequest({ name: 'floor-lead' }), { params: Promise.resolve({ id: 'role-1' }) });

    expect(response.status).toBe(200);
    expect(User.updateMany).toHaveBeenCalledWith(
      { role: 'supervisor' },
      { role: 'floor-lead' },
      { runValidators: true }
    );
    expect(role.name).toBe('floor-lead');
  });

  it('blocks modifying a system role entirely', async () => {
    (Role.findById as jest.Mock).mockResolvedValue({ _id: 'role-1', name: 'admin', isSystem: true });

    const response = await updateRole(makeUpdateRequest({ description: 'New description' }), { params: Promise.resolve({ id: 'role-1' }) });

    expect(response.status).toBe(403);
    expect(User.updateMany).not.toHaveBeenCalled();
  });
});
