import { NextRequest, NextResponse } from 'next/server';
import { createExpense, getExpenses } from '@/lib/actions/expenses';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/error-handler';
import { hasPermission, UserRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 30 requests per minute per user/IP
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 30, 60 * 1000);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role as UserRole, 'view_expenses')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      category: searchParams.get('category') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    const expenses = await getExpenses(filters);
    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per user/IP
    const identifier = getClientIdentifier(request);
    const rateLimitResult = rateLimit(identifier, 10, 60 * 1000);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user.role as UserRole, 'manage_expenses')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const expense = await createExpense(data);
    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}
