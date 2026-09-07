import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAdmin(async (req, user) => {
    try {
      await connectDB();

      const userDoc = await User.findById(id).select('-password').lean();

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { ...userDoc, status: userDoc.isActive ? 'active' : 'inactive' }
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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAdmin(async (req, user) => {
    try {
      await connectDB();

      const data = await request.json();

      // Don't allow password update through this endpoint
      delete data.password;

      // The frontend deals in a 'status' string; the schema stores isActive.
      const { status, ...rest } = data;
      const update: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (status === 'active' || status === 'inactive') {
        update.isActive = status === 'active';
      }

      const userDoc = await User.findByIdAndUpdate(
        id,
        update,
        { new: true, runValidators: true }
      ).select('-password').lean();

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { ...userDoc, status: userDoc.isActive ? 'active' : 'inactive' }
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAdmin(async (req, user) => {
    try {
      await connectDB();

      const userDoc = await User.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      ).select('-password');
      
      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: userDoc
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
