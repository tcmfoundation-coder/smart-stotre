import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';
import { hasPermission, UserRole } from './rbac';
import connectDB from './mongodb';
import User from '@/models/User';

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
  statusCode?: number;
}

/**
 * Authenticate a request and return the user session.
 *
 * Role and active-status are re-verified against the database on every
 * request rather than trusted from the session's JWT, which is only
 * populated at sign-in and can otherwise stay stale (old role, or an
 * account deactivated after login) for up to the session's 30-day lifetime.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Unauthorized - No valid session',
        statusCode: 401
      };
    }

    await connectDB();
    const dbUser = await User.findById(session.user.id).select('role isActive');

    if (!dbUser || !dbUser.isActive) {
      return {
        success: false,
        error: 'Unauthorized - Account not found or inactive',
        statusCode: 401
      };
    }

    return {
      success: true,
      user: {
        ...session.user,
        role: dbUser.role,
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed',
      statusCode: 401
    };
  }
}

/**
 * Helper to handle auth errors in API routes
 */
export function handleAuthError(authResult: AuthResult): NextResponse {
  return NextResponse.json(
    { success: false, error: authResult.error },
    { status: authResult.statusCode || 401 }
  );
}

/**
 * Middleware wrapper for API routes with authentication only
 */
export function withAuth(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      return handleAuthError(authResult);
    }

    return handler(request, authResult.user);
  };
}

/**
 * Middleware wrapper with permission check
 */
export function withPermission(permissionName: string) {
  return function(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const authResult = await authenticateRequest(request);
      
      if (!authResult.success) {
        return handleAuthError(authResult);
      }

      const userRole = authResult.user.role as UserRole;
      
      if (!hasPermission(userRole, permissionName)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(request, authResult.user);
    };
  };
}

/**
 * Middleware wrapper with role check
 */
export function withRole(allowedRoles: UserRole[]) {
  return function(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const authResult = await authenticateRequest(request);
      
      if (!authResult.success) {
        return handleAuthError(authResult);
      }

      const userRole = authResult.user.role as UserRole;
      
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Role not authorized' },
          { status: 403 }
        );
      }

      return handler(request, authResult.user);
    };
  };
}

/**
 * Admin-only middleware
 */
export function withAdmin(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return withRole(['admin'])(handler);
}

/**
 * Manager or Admin middleware
 */
export function withManagerOrAdmin(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return withRole(['admin', 'manager'])(handler);
}
