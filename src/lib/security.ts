import { auth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string | null;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * Get the current authenticated user.
 *
 * Role, active-status, and branch are re-verified against the database on
 * every call rather than trusted from the session's JWT, which is only
 * populated at sign-in and can otherwise stay stale (old role, or an
 * account deactivated after login) for up to the session's 30-day lifetime.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const email = typeof session.user.email === 'string' ? session.user.email : null;
  const name = typeof session.user.name === 'string' ? session.user.name : null;

  if (!email || !name) {
    return null;
  }

  await connectDB();
  const dbUser = await User.findById(session.user.id).select('role isActive branchId');

  if (!dbUser || !dbUser.isActive) {
    return null;
  }

  return {
    id: session.user.id,
    email,
    name,
    role: dbUser.role as UserRole,
    branchId: dbUser.branchId?.toString() || null,
  };
}

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Check if the current user has manager role or higher
 */
export async function isManagerOrAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin' || user?.role === 'manager';
}

/**
 * Check if the current user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === role;
}

/**
 * Check if the current user has any of the specified roles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}

/**
 * Require manager or admin access - throws error if not authorized
 */
export async function requireManagerOrAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw new Error('Manager or admin access required');
  }
  return user;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Check if user can manage other users (admin only)
 */
export async function canManageUsers(): Promise<boolean> {
  return await isAdmin();
}

/**
 * Check if user can create users (admin only)
 */
export async function canCreateUsers(): Promise<boolean> {
  return await isAdmin();
}

/**
 * Check if user can delete users (admin only)
 */
export async function canDeleteUsers(): Promise<boolean> {
  return await isAdmin();
}

/**
 * Check if user can manage employees (admin only)
 */
export async function canManageEmployees(): Promise<boolean> {
  return await isAdmin();
}

/**
 * Check if user can manage inventory (manager and admin)
 */
export async function canManageInventory(): Promise<boolean> {
  return await isManagerOrAdmin();
}

/**
 * Check if user can manage suppliers (manager and admin)
 */
export async function canManageSuppliers(): Promise<boolean> {
  return await isManagerOrAdmin();
}

/**
 * Check if user can manage branches (admin only)
 */
export async function canManageBranches(): Promise<boolean> {
  return await isAdmin();
}

/**
 * Check if user can access sales data (all authenticated users)
 */
export async function canAccessSales(): Promise<boolean> {
  return await isAuthenticated();
}

/**
 * Check if user can access POS (cashier, manager, admin)
 */
export async function canAccessPOS(): Promise<boolean> {
  return await isAuthenticated();
}

/**
 * Check if user can view analytics (manager and admin)
 */
export async function canViewAnalytics(): Promise<boolean> {
  return await isManagerOrAdmin();
}

/**
 * Check if user can view reports (manager and admin)
 */
export async function canViewReports(): Promise<boolean> {
  return await isManagerOrAdmin();
}
