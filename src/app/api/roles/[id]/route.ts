import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import User from '@/models/User';
import { handleApiError } from '@/lib/error-handler';
import { logActivity } from '@/lib/activity-log';

// See the matching comment in ../route.ts - these three names are the real,
// schema-enforced User.role values; a custom role must never take one of
// them, and renaming one of these values away is never safe to cascade.
const RESERVED_ROLE_NAMES = ['admin', 'manager', 'cashier'];

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
        const newName = name.toLowerCase();

        if (RESERVED_ROLE_NAMES.includes(newName) || RESERVED_ROLE_NAMES.includes(role.name)) {
          return NextResponse.json(
            { success: false, error: 'Cannot rename a custom role to or from a reserved system role name' },
            { status: 400 }
          );
        }

        // Check if new name already exists
        const existingRole = await Role.findOne({ name: newName });
        if (existingRole) {
          return NextResponse.json(
            { success: false, error: 'Role with this name already exists' },
            { status: 409 }
          );
        }

        // Update user roles if name changed. runValidators ensures this is
        // still rejected for any user if the new name somehow isn't a valid
        // User.role value - the reserved-name guard above is what actually
        // prevents a real admin/manager/cashier from being silently
        // reassigned by an unrelated rename.
        await User.updateMany(
          { role: role.name },
          { role: newName },
          { runValidators: true }
        );

        role.name = newName;
      }

      if (description !== undefined) {
        role.description = description;
      }

      if (permissions !== undefined) {
        role.permissions = permissions;
      }

      await role.save();

      logActivity({
        action: 'ROLE_UPDATED',
        description: `${user.name || 'Unknown'} updated role "${role.name}"`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

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

      logActivity({
        action: 'ROLE_DELETED',
        description: `${user.name || 'Unknown'} deleted role "${role.name}"`,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
        severity: 'warning',
      });

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
