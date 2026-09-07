import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/middleware';
import connectDB from '@/lib/mongodb';
import Role from '@/models/Role';
import User from '@/models/User';
import { handleApiError } from '@/lib/error-handler';
import { escapeRegex } from '@/lib/utils';

export async function GET(request: NextRequest) {
  return withAdmin(async (req, user) => {
    try {
      await connectDB();
      
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      
      let query: any = {};
      if (search) {
        query.name = { $regex: escapeRegex(search), $options: 'i' };
      }
      
      const roles = await Role.find(query).sort({ name: 1 });
      
      // Get user count for each role
      const roleData = await Promise.all(
        roles.map(async (role) => {
          const userCount = await User.countDocuments({ role: role.name });
          return {
            _id: role._id,
            id: role._id,
            name: role.name,
            description: role.description,
            permissions: role.permissions,
            isSystem: role.isSystem,
            userCount,
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        data: roleData
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
      
      const body = await request.json();
      const { name, description, permissions } = body;
      
      if (!name || !description) {
        return NextResponse.json(
          { success: false, error: 'Name and description are required' },
          { status: 400 }
        );
      }
      
      // Check if role already exists
      const existingRole = await Role.findOne({ name: name.toLowerCase() });
      if (existingRole) {
        return NextResponse.json(
          { success: false, error: 'Role with this name already exists' },
          { status: 409 }
        );
      }
      
      const role = await Role.create({
        name: name.toLowerCase(),
        description,
        permissions: permissions || [],
        isSystem: false,
      });
      
      return NextResponse.json({
        success: true,
        data: role
      }, { status: 201 });
    } catch (error) {
      const errorResponse = handleApiError(error);
      return NextResponse.json(
        { success: false, error: errorResponse.error },
        { status: errorResponse.statusCode }
      );
    }
  })(request);
}
