import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { handleApiError } from '@/lib/error-handler';
import { escapeRegex } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';

export async function GET(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      await connectDB();
      
      const searchParams = request.nextUrl.searchParams;
      const role = searchParams.get('role') || 'all';
      const status = searchParams.get('status') || 'all';
      const search = searchParams.get('search') || '';
      
      const query: any = {};
      
      if (role !== 'all') {
        query.role = role;
      }
      
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
      
      if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } }
        ];
      }
      
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

      const data = users.map((u) => ({
        ...u,
        status: u.isActive ? 'active' : 'inactive',
      }));

      return NextResponse.json({
        success: true,
        data
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

export async function POST(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      await connectDB();
      
      const data = await request.json();

      // Check if email already exists
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }

      const { status, ...rest } = data;

      const newUser = await User.create({
        ...rest,
        isActive: status ? status === 'active' : true,
      });

      // Remove password from response
      const userResponse = newUser.toObject();
      delete (userResponse as any).password;

      logActivity({
        action: 'USER_CREATED',
        description: `${user.name || 'Unknown'} created user "${newUser.name}" (${newUser.email}) with role "${newUser.role}"`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

      return NextResponse.json({
        success: true,
        data: { ...userResponse, status: userResponse.isActive ? 'active' : 'inactive' }
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
