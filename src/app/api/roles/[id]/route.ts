import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import User from '@/models/User';
import { handleApiError } from '@/lib/error-handler';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAdmin(async (req, user) => {
    try {
      await connectDB();

      const role = await Role.findById(id);
      
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role not found' },
          { status: 404 }
        );
      }
      
      const userCount = await User.countDocuments({ role: role.name });
      
      return NextResponse.json({
        success: true,
        data: {
          ...role.toObject(),
          userCount,
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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withAdmin(async (req, user) => {
    try {
      await connectDB();

      const role = await Role.findById(id);
      
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role not found' },
          { status: 404 }
        );
      }
      
      if (role.isSystem) {
        return NextResponse.json(
          { success: false, error: 'Cannot modify system roles' },
          { status: 403 }
        );
      }
      
      const body = await request.json();
      const { name, description, permissions } = body;
      
      if (name && name !== role.name) {
        // Check if new name already exists
        const existingRole = await Role.findOne({ name: name.toLowerCase() });
        if (existingRole) {
          return NextResponse.json(
            { success: false, error: 'Role with this name already exists' },
            { status: 409 }
          );
        }
        
        // Update user roles if name changed
        await User.updateMany(
          { role: role.name },
          { role: name.toLowerCase() }
        );
        
        role.name = name.toLowerCase();
      }
      
      if (description !== undefined) {
        role.description = description;
      }
      
      if (permissions !== undefined) {
        role.permissions = permissions;
      }
      
      await role.save();
      
      return NextResponse.json({
        success: true,
        data: role
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

      const role = await Role.findById(id);
      
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role not found' },
          { status: 404 }
        );
      }
      
      if (role.isSystem) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete system roles' },
          { status: 403 }
        );
      }
      
      // Check if users are assigned to this role
      const userCount = await User.countDocuments({ role: role.name });
      if (userCount > 0) {
        return NextResponse.json(
          { success: false, error: `Cannot delete role with ${userCount} assigned users. Please reassign users first.` },
          { status: 400 }
        );
      }
      
      await Role.findByIdAndDelete(id);
      
      return NextResponse.json({
        success: true,
        message: 'Role deleted successfully'
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
