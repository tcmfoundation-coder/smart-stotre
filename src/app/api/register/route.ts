import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User, Role } from '@/models';
import { withAdmin } from '@/lib/api-auth';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  return withAdmin(async (req) => {
  try {
    // Rate limiting: 5 requests per minute per user/IP (strict for user creation)
    const identifier = getClientIdentifier(req);
    const rateLimitResult = rateLimit(identifier, 5, 60 * 1000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    const { name, email, password, role, phone } = await req.json();

    // Validate input
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate role exists in database
    const roleExists = await Role.findOne({ name: role.toLowerCase() });
    if (!roleExists) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role.toLowerCase(),
      phone,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
  })(request);
}
